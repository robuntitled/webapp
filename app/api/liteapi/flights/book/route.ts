import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookFlight } from '@/lib/liteapi/flight-booking';
import { confirmParticipantFlight } from '@/lib/data/trip-commitments';
import { getPractice, savePracticeFlightBooking } from '@/lib/data/practices';
import {
  BOOKING_RECONCILIATION_USER_MESSAGE,
  recordBookingReconciliation,
  withSaveRetry,
} from '@/lib/data/booking-reconciliation';
import { loadPrebookQuote, resolveBookedAmount } from '@/lib/liteapi/prebook-store';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-confirmation';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';

const PAYMENT_VERIFY_MESSAGE =
  'Pagamento ricevuto, stiamo verificando la prenotazione. Ti scriviamo per email.' as const;

const legSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  airline: z.string().nullable(),
  airlineCode: z.string().nullable().optional(),
  airlineLogo: z.string().nullable().optional(),
  departureAt: z.string().nullable().optional(),
  arrivalAt: z.string().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
  stops: z.number().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  cabinClass: z.string().nullable().optional(),
});

const schema = z.object({
  prebookId: z.string().trim().min(4).max(200),
  transactionId: z.string().trim().min(4).max(200),
  tripId: z.string().uuid().optional(),
  practiceId: z.string().uuid().optional(),
  /** Ignored — server amount from prebook store / book response (A2). */
  amountEur: z.number().finite().nonnegative().max(1_000_000).optional(),
  snapshot: z
    .object({
      offerId: z.string().optional(),
      currency: z.string().optional(),
      outbound: legSchema,
      returnLeg: legSchema.nullable().optional(),
    })
    .optional(),
});

async function persistRecon(input: Parameters<typeof recordBookingReconciliation>[0]) {
  const r = await recordBookingReconciliation(input);
  if ('error' in r) {
    console.error('[flights/book] reconciliation persist FAILED', {
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
      { error: 'Servizio voli non configurato.' },
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
    return NextResponse.json({ error: 'Parametri booking non validi' }, { status: 400 });
  }

  const { prebookId, transactionId, practiceId, tripId, snapshot } = parsed.data;
  const quoteLoad = await loadPrebookQuote('flight', prebookId, session.user.id);
  if (quoteLoad.ok === false && quoteLoad.reason === 'forbidden') {
    return NextResponse.json({ error: 'Sessione prebook non valida.' }, { status: 403 });
  }
  const quote = quoteLoad.ok ? quoteLoad.quote : null;

  if (practiceId) {
    const existing = await getPractice(practiceId, session.user.id);
    const fb = existing?.flight_booking;
    if (
      fb &&
      ((fb.prebookId && fb.prebookId === prebookId) ||
        (fb.transactionId && fb.transactionId === transactionId))
    ) {
      return NextResponse.json({
        ok: true,
        bookingId: fb.bookingId,
        bookingRef: fb.bookingRef,
        status: fb.status,
        practiceId,
        idempotent: true,
      });
    }
  }

  try {
    const result = await bookFlight({ prebookId, transactionId });
    const amounts = resolveBookedAmount({
      bookPrice: result.price,
      bookCurrency: result.currency,
      quote,
    });

    let reconciliationPending = false;
    let savedPracticeId: string | undefined;

    if (practiceId && snapshot) {
      const recap: FlightBookingRecap = {
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        status: result.status,
        offerId: amounts.offerId ?? quote?.offerId ?? null,
        amountEur: amounts.amountEur,
        currency: amounts.currency ?? 'EUR',
        prebookId,
        transactionId,
        outbound: snapshot.outbound,
        returnLeg: snapshot.returnLeg ?? null,
        bookedAt: new Date().toISOString(),
      };

      const saveResult = await withSaveRetry('flights/book practice', () =>
        savePracticeFlightBooking({
          practiceId,
          userId: session.user.id,
          recap,
        })
      );

      if (saveResult.ok && saveResult.value && 'practice' in saveResult.value) {
        const saved = saveResult.value;
        savedPracticeId = saved.practice.id;
        if (tripId) {
          await confirmParticipantFlight({
            tripId,
            userId: session.user.id,
            bookingRef: result.bookingRef,
            providerStatus: result.status,
          }).catch(async (err: unknown) => {
            console.error('[flights/book] confirm seat', err);
            await persistRecon({
              userId: session.user.id,
              practiceId,
              kind: 'flight',
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
              lastError: 'confirm_seat_failed',
            });
          });
        }
        const email = session.user.email;
        if (email) {
          const dest =
            findItineraryTemplate(saved.practice.template_id)?.destination_name ??
            'il tuo viaggio';
          after(() =>
            sendBookingConfirmationEmail({
              to: email,
              kind: 'flight',
              destinationName: dest,
              practiceId: saved.practice.id,
              bookingRef: result.bookingRef,
              amountEur: recap.amountEur,
              currency: recap.currency,
              flight: recap,
            })
              .then(() =>
                console.info('[flights/book] email ok', saved.practice.id)
              )
              .catch((err) =>
                console.error('[flights/book] email fail', saved.practice.id, err)
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
          kind: 'flight',
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
      reconciliationPending = true;
      await persistRecon({
        userId: session.user.id,
        practiceId: practiceId ?? null,
        kind: 'flight',
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
      if (tripId) {
        await confirmParticipantFlight({
          tripId,
          userId: session.user.id,
          bookingRef: result.bookingRef,
          providerStatus: result.status,
        }).catch((err: unknown) =>
          console.error('[flights/book] confirm seat orphan', err)
        );
      }
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
      console.error('[flights/book]', e.status, e.message, e.body);
      if (e.status === 409) {
        return NextResponse.json(
          {
            error:
              'Prenotazione già in corso o in conflitto. Controlla le email o riprova dalla ricerca.',
            code: 'conflict',
          },
          { status: 409 }
        );
      }
      const ref = `F-BK-${Date.now().toString(36).slice(-6)}`;
      await persistRecon({
        userId: session.user.id,
        practiceId,
        kind: 'flight',
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
    const ref = `F-BK-${Date.now().toString(36).slice(-6)}`;
    console.error('[flights/book]', ref, e);
    await persistRecon({
      userId: session.user.id,
      practiceId,
      kind: 'flight',
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
