import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookHotel } from '@/lib/liteapi/hotel-booking';
import { confirmParticipantHotel, tripAllowsHotelBooking } from '@/lib/data/trip-commitments';
import { savePracticeHotelBooking } from '@/lib/data/practices';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-confirmation';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';

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

  try {
    if (parsed.data.tripId) {
      const allowed = await tripAllowsHotelBooking(parsed.data.tripId);
      if (!allowed) {
        return NextResponse.json(
          {
            error:
              'Hotel disponibile solo dopo la soglia voli. Conferma prima il tuo volo sul Trip.',
          },
          { status: 403 }
        );
      }
    }

    const result = await bookHotel(parsed.data);
    if (parsed.data.tripId) {
      await confirmParticipantHotel({
        tripId: parsed.data.tripId,
        userId: session.user.id,
        matchesGroup: true,
        bookingRef: result.bookingRef,
      }).catch((err) => console.error('[hotels/book] confirm hotel', err));
    }
    if (parsed.data.practiceId && parsed.data.snapshot) {
      const recap = {
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        hotelName: parsed.data.snapshot.hotelName,
        city: parsed.data.snapshot.city ?? null,
        address: parsed.data.snapshot.address ?? null,
        roomName: parsed.data.snapshot.roomName ?? null,
        checkin: parsed.data.snapshot.checkin ?? null,
        checkout: parsed.data.snapshot.checkout ?? null,
        amountEur: parsed.data.amountEur ?? null,
        currency: parsed.data.snapshot.currency ?? 'EUR',
        bookedAt: new Date().toISOString(),
      };
      const saved = await savePracticeHotelBooking({
        practiceId: parsed.data.practiceId,
        userId: session.user.id,
        recap,
      }).catch((err) => {
        console.error('[hotels/book] practice', err);
        return null;
      });
      const email = session.user.email;
      if (email && saved && 'practice' in saved) {
        const dest =
          findItineraryTemplate(saved.practice.template_id)?.destination_name ?? 'il tuo viaggio';
        void sendBookingConfirmationEmail({
          to: email,
          kind: 'hotel',
          destinationName: dest,
          practiceId: saved.practice.id,
          bookingRef: result.bookingRef,
          amountEur: recap.amountEur,
          currency: recap.currency,
          hotel: recap,
        });
      }
    }
    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      bookingRef: result.bookingRef,
      status: result.status,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[hotels/book]', e.status, e.message, e.body);
      return NextResponse.json(
        {
          error:
            e.status === 409
              ? 'Prenotazione già in corso o in conflitto. Controlla l’email o riprova.'
              : e.message,
          code: e.status === 409 ? 'conflict' : 'book_error',
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[hotels/book]', e);
    return NextResponse.json(
      { error: 'Errore conferma prenotazione hotel.' },
      { status: 500 }
    );
  }
}
