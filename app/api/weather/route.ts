import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchTripWeather } from '@/lib/weather/open-meteo';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  try {
    const days = await fetchTripWeather(
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.startDate,
      parsed.data.endDate
    );
    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: 'Meteo non disponibile' }, { status: 502 });
  }
}