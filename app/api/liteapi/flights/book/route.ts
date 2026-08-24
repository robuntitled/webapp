import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookFlight } from '@/lib/liteapi/flight-booking';
import { confirmParticipantFlight } from '@/lib/data/trip-commitments';
import { savePracticeFlightBooking } from '@/lib/data/practices';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-confirmation';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';

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

  try {
    const result = await bookFlight(parsed.data);
    if (parsed.data.tripId) {
      await confirmParticipantFlight({
        tripId: parsed.data.tripId,
        userId: session.user.id,
        bookingRef: result.bookingRef,
      }).catch((err: unknown) => console.error('[flights/book] confirm seat', err));
    }
    if (parsed.data.practiceId && parsed.data.snapshot) {
      const recap = {
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        status: result.status,
        offerId: parsed.data.snapshot.offerId ?? null,
        amountEur: parsed.data.amountEur ?? null,
        currency: parsed.data.snapshot.currency ?? 'EUR',
        outbound: parsed.data.snapshot.outbound,
        returnLeg: parsed.data.snapshot.returnLeg ?? null,
        bookedAt: new Date().toISOString(),
      };
      const saved = await savePracticeFlightBooking({
        practiceId: parsed.data.practiceId,
        userId: session.user.id,
        recap,
      }).catch((err) => {
        console.error('[flights/book] practice', err);
        return null;
      });
      const email = session.user.email;
      if (email && saved && 'practice' in saved) {
        const dest =
          findItineraryTemplate(saved.practice.template_id)?.destination_name ?? 'il tuo viaggio';
        void sendBookingConfirmationEmail({
          to: email,
          kind: 'flight',
          destinationName: dest,
          practiceId: saved.practice.id,
          bookingRef: result.bookingRef,
          amountEur: recap.amountEur,
          currency: recap.currency,
          flight: recap,
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
      console.error('[flights/book]', e.status, e.message, e.body);
      return NextResponse.json(
        {
          error:
            e.status === 409
              ? 'Prenotazione già in corso o in conflitto. Controlla le email o riprova dalla ricerca.'
              : e.message,
          code: e.status === 409 ? 'conflict' : 'book_error',
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[flights/book]', e);
    return NextResponse.json({ error: 'Errore conferma prenotazione.' }, { status: 500 });
  }
}
