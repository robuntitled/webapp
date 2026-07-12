import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchCheapestFlightQuote, isDataApiConfigured } from '@/lib/travelpayouts/data-api';
import { buildTripFlightSearchUrl } from '@/lib/travelpayouts/flight-search';
import { getTravelSetupStatus } from '@/lib/travelpayouts/setup-hints';

const querySchema = z.object({
  destination: z.string().min(2).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  origin: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .optional(),
});

export async function GET(request: Request) {
  const setup = getTravelSetupStatus();
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    destination: searchParams.get('destination'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    origin: searchParams.get('origin') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametri non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { destination, startDate, endDate, origin } = parsed.data;

  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: 'La data di ritorno deve essere dopo la partenza' }, { status: 400 });
  }

  const affiliateUrl = buildTripFlightSearchUrl({
    destination,
    startDate,
    endDate,
    originIata: origin?.toUpperCase(),
  });

  if (!isDataApiConfigured()) {
    return NextResponse.json({
      configured: false,
      found: false,
      affiliateUrl,
      setup,
      message: affiliateUrl
        ? 'Stima prezzo non disponibile (manca TRAVELPAYOUTS_API_TOKEN) — puoi aprire la ricerca affiliate.'
        : setup.hints[0] ?? 'Configura Travelpayouts su Vercel (marker + programmi Aviasales/Booking).',
    });
  }

  try {
    const quote = await fetchCheapestFlightQuote({
      destination,
      startDate,
      endDate,
      originIata: origin?.toUpperCase(),
    });

    if (!quote) {
      return NextResponse.json({
        configured: true,
        found: false,
        affiliateUrl,
        setup,
        message:
          'Nessun prezzo in cache per questa rotta. Apri la ricerca affiliate per tariffe aggiornate.',
      });
    }

    return NextResponse.json({
      configured: true,
      found: true,
      quote,
      affiliateUrl,
      setup,
      disclaimer:
        'Prezzo da cache Travelpayouts (non in tempo reale). Può variare al momento della prenotazione.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore imprevisto';
    return NextResponse.json(
      { error: message, affiliateUrl, setup },
      { status: 502 }
    );
  }
}