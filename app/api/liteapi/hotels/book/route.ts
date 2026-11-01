import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookHotel } from '@/lib/liteapi/hotel-booking';
import { confirmParticipantHotel } from '@/lib/data/trip-commitments';
import { getPractice, savePracticeHotelBooking } from '@/lib/data/practices';
import { checkHotelEligibility } from '@/lib/data/hotel-eligibility';
import {
  BOOKING_RECONCILIATION_USER_MESSAGE,
  recordBookingReconciliation,
  withSaveRetry,
} from '@/lib/data/booking-reconciliation';
import { loadPrebookQuote, resolveBookedAmount } from '@/lib/liteapi/prebook-store';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-confirmation';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import type { HotelBookingRecap } from '@/lib/itineraries/bookings';

const PAYMENT_VERIFY_MESSAGE =
  'Pagamento ricevuto, stiamo verificando la prenotazione. Ti scriviamo per email.' as const;

const schema = z.object({
  prebookId: z.string().trim().min(4).max(200),
  transactionId: z.string().trim().min(4).max(200),
  holder: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(160),
  }),
  guests: z
    .array(
      z.object({
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        email: z.string().trim().email().max(160),
        occupancyNumber: z.number().int().min(1).max(9).optional(),
      })
    )
    .min(1)
    .max(9),
  tripId: z.string().uuid().optional(),
  practiceId: z.string().uuid().optional(),
  /** Ignored — server amount from prebook store / book response (A2). */
  amountEur: z.number().finite().nonnegative().max(1_000_000).optional(),
  snapshot: z
    .object({
      hotelName: z.string(),
      city: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      roomName: z.string().nullable().optional(),
      checkin: z.string().nullable().optional(),
      checkout: z.string().nullable().optional(),
      currency: z.string().optional(),
    })
    .optional(),
});

async function persistRecon(input: Parameters<typeof recordBookingReconciliation>[0]) {
  const r = await recordBookingReconciliation(input);
  if ('error' in r) {
    console.error('[hotels/book] reconciliation persist FAILED', {
      ...input,
      dbError: r.error,
    });
  }
  return r;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  }
  if (!isLiteApiConfigured()) {
    return NextResponse.json(
      { error: 'Servizio hotel non configurato.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati prenotazione non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prebookId, transactionId, practiceId, tripId, snapshot } = parsed.data;
  const quoteLoad = await loadPrebookQuote('hotel', prebookId, session.user.id);
  if (quoteLoad.ok === false && quoteLoad.reason === 'forbidden') {
    return NextResponse.json({ error: 'Sessione prebook non valida.' }, { status: 403 });
  }
  const quote = quoteLoad.ok ? quoteLoad.quote : null;

  // Idempotency: already saved with same prebook/transaction
  if (practiceId) {
    const existing = await getPractice(practiceId, session.user.id);
    const hotels = existing?.hotel_bookings ?? [];
    const dup = hotels.find(
      (h) =>
        (h.prebookId && h.prebookId === prebookId) ||
        (h.transactionId && h.transactionId === transactionId)
    );
    if (dup) {
      return NextResponse.json({
        ok: true,
        bookingId: dup.bookingId,
        bookingRef: dup.bookingRef,
        status: 'CONFIRMED',
        practiceId,
        idempotent: true,
      });
    }
  }

  // After payment: eligibility failure → reconcile, do not book again
  const eligibility = await checkHotelEligibility({
    userId: session.user.id,
    practiceId,
    tripId,
  });
  if (!eligibility.ok) {
    const amounts = resolveBookedAmount({ quote });
    await persistRecon({
      userId: session.user.id,
      practiceId,
      kind: 'hotel',
      providerStatus: 'eligibility_failed_after_payment',
      amountEur: amounts.amountEur,
      currency: amounts.currency,
      payload: { prebookId, transactionId, reason: eligibility.reason },
      lastError: 'eligibility_failed_after_payment',
    });
    return NextResponse.json({
      ok: true,
      reconciliationPending: true,
      message: BOOKING_RECONCILIATION_USER_MESSAGE,
    });
  }

  try {
    const result = await bookHotel(parsed.data);
    const amounts = resolveBookedAmount({
      bookPrice: result.price,
      bookCurrency: result.currency,
      quote,
    });

    if (tripId) {
      await confirmParticipantHotel({
        tripId,
        userId: session.user.id,
        matchesGroup: true,
        bookingRef: result.bookingRef,
      }).catch(async (err: unknown) => {
        console.error('[hotels/book] confirm hotel', err);
        await persistRecon({
          userId: session.user.id,
          practiceId,
          kind: 'hotel',
          providerBookingId: result.bookingId,
          providerBookingRef: result.bookingRef,
          providerStatus: result.status,
          amountEur: amounts.amountEur,
          currency: amounts.currency,
          payload: {
            prebookId,
            transactionId,
            seatWriteFailed: true,
            error: err instanceof Error ? err.message : String(err),
          },
          lastError: 'confirm_hotel_failed',
        });
      });
    }

    let reconciliationPending = false;
    let savedPracticeId: string | undefined;

    if (practiceId && snapshot) {
      const recap: HotelBookingRecap = {
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        hotelName: snapshot.hotelName,
        city: snapshot.city ?? null,
        address: snapshot.address ?? null,
        roomName: snapshot.roomName ?? null,
        checkin: snapshot.checkin ?? null,
        checkout: snapshot.checkout ?? null,
        amountEur: amounts.amountEur,
        currency: amounts.currency ?? 'EUR',
        prebookId,
        transactionId,
        bookedAt: new Date().toISOString(),
      };

      const saveResult = await withSaveRetry('hotels/book practice', () =>
        savePracticeHotelBooking({
          practiceId,
          userId: session.user.id,
          recap,
        })
      );

      if (saveResult.ok && saveResult.value && 'practice' in saveResult.value) {
        const saved = saveResult.value;
        savedPracticeId = saved.practice.id;
        const email = session.user.email;
        if (email) {
          const dest =
            findItineraryTemplate(saved.practice.template_id)?.destination_name ??
            'il tuo viaggio';
          after(() =>
            sendBookingConfirmationEmail({
              to: email,
              kind: 'hotel',
              destinationName: dest,
              practiceId: saved.practice.id,
              bookingRef: result.bookingRef,
              amountEur: recap.amountEur,
              currency: recap.currency,
              hotel: recap,
            })
              .then(() =>
                console.info('[hotels/book] email ok', saved.practice.id)
              )
              .catch((err) =>
                console.error('[hotels/book] email fail', saved.practice.id, err)
              )
          );
        }
      } else {
        const errMsg =
          !saveResult.ok
            ? saveResult.error
            : 'error' in saveResult.value
              ? saveResult.value.error
              : 'Salvataggio pratica fallito';
        reconciliationPending = true;
        await persistRecon({
          userId: session.user.id,
          practiceId,
          kind: 'hotel',
          providerBookingId: result.bookingId,
          providerBookingRef: result.bookingRef,
          providerStatus: result.status,
          amountEur: amounts.amountEur,
          currency: amounts.currency,
          payload: { recap, prebookId, transactionId },
          lastError: errMsg,
        });
      }
    } else {
      // No practice/snapshot — orphan row for support
      reconciliationPending = true;
      await persistRecon({
        userId: session.user.id,
        practiceId: practiceId ?? null,
        kind: 'hotel',
        providerBookingId: result.bookingId,
        providerBookingRef: result.bookingRef,
        providerStatus: result.status ?? 'orphan_booking',
        amountEur: amounts.amountEur,
        currency: amounts.currency,
        payload: {
          orphan: true,
          prebookId,
          transactionId,
          snapshot: snapshot ?? null,
          offerId: amounts.offerId,
        },
        lastError: 'orphan_booking_no_practice',
      });
    }

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      bookingRef: result.bookingRef,
      status: result.status,
      ...(reconciliationPending
        ? {
            reconciliationPending: true,
            message: BOOKING_RECONCILIATION_USER_MESSAGE,
          }
        : {}),
      ...(savedPracticeId ? { practiceId: savedPracticeId } : {}),
    });
  } catch (e) {
    const amounts = resolveBookedAmount({ quote });
    if (e instanceof LiteApiError) {
      console.error('[hotels/book]', e.status, e.message, e.body);
      if (e.status === 409) {
        return NextResponse.json(
          {
            error:
              'Prenotazione già in corso o in conflitto. Controlla l’email o riprova.',
            code: 'conflict',
          },
          { status: 409 }
        );
      }
      const ref = `H-BK-${Date.now().toString(36).slice(-6)}`;
      await persistRecon({
        userId: session.user.id,
        practiceId,
        kind: 'hotel',
        providerStatus: 'book_failed',
        amountEur: amounts.amountEur,
        currency: amounts.currency,
        payload: {
          prebookId,
          transactionId,
          providerHttp: e.status,
          providerMessage: e.message,
          ref,
        },
        lastError: `book_failed:${e.status}`,
      });
      return NextResponse.json(
        { error: PAYMENT_VERIFY_MESSAGE, code: 'book_error', ref },
        { status: 200 }
      );
    }
    const ref = `H-BK-${Date.now().toString(36).slice(-6)}`;
    console.error('[hotels/book]', ref, e);
    await persistRecon({
      userId: session.user.id,
      practiceId,
      kind: 'hotel',
      providerStatus: 'book_failed',
      amountEur: amounts.amountEur,
      currency: amounts.currency,
      payload: {
        prebookId,
        transactionId,
        error: e instanceof Error ? e.message : String(e),
        ref,
      },
      lastError: 'book_failed',
    });
    return NextResponse.json(
      { error: PAYMENT_VERIFY_MESSAGE, ref },
      { status: 200 }
    );
  }
}
