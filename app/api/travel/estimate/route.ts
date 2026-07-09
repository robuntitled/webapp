import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchCheapestFlightQuote, isDataApiConfigured } from '@/lib/travelpayouts/data-api';

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
  if (!isDataApiConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: 'TRAVELPAYOUTS_API_TOKEN non configurato',
      },
      { status: 503 }
    );
  }

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
        message:
          'Nessun prezzo in cache per questa rotta. Prova a cambiare destinazione o date, oppure inserisci il prezzo manualmente.',
      });
    }

    return NextResponse.json({
      configured: true,
      found: true,
      quote,
      disclaimer:
        'Prezzo da cache Travelpayouts (non in tempo reale). Può variare al momento della prenotazione.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore imprevisto';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}