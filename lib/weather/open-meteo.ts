const WMO_LABELS: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Sereno', emoji: '☀️' },
  1: { label: 'Preval. sereno', emoji: '🌤️' },
  2: { label: 'Parz. nuvoloso', emoji: '⛅' },
  3: { label: 'Nuvoloso', emoji: '☁️' },
  45: { label: 'Nebbia', emoji: '🌫️' },
  48: { label: 'Nebbia gelata', emoji: '🌫️' },
  51: { label: 'Pioggerella', emoji: '🌦️' },
  53: { label: 'Pioggerella', emoji: '🌦️' },
  55: { label: 'Pioggerella forte', emoji: '🌧️' },
  61: { label: 'Pioggia leggera', emoji: '🌧️' },
  63: { label: 'Pioggia', emoji: '🌧️' },
  65: { label: 'Pioggia forte', emoji: '🌧️' },
  71: { label: 'Neve leggera', emoji: '🌨️' },
  73: { label: 'Neve', emoji: '❄️' },
  75: { label: 'Neve forte', emoji: '❄️' },
  80: { label: 'Rovesci', emoji: '🌦️' },
  81: { label: 'Rovesci', emoji: '🌧️' },
  82: { label: 'Rovesci forti', emoji: '⛈️' },
  95: { label: 'Temporale', emoji: '⛈️' },
};

export type DayWeather = {
  date: string;
  tempMax: number;
  tempMin: number;
  code: number;
  label: string;
  emoji: string;
};

export async function fetchTripWeather(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<DayWeather[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min'
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error('Weather unavailable');

  const data = await response.json();
  const daily = data.daily as {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };

  return daily.time.map((date, i) => {
    const code = daily.weather_code[i] ?? 0;
    const wmo = WMO_LABELS[code] ?? { label: 'Variabile', emoji: '🌡️' };
    return {
      date,
      tempMax: Math.round(daily.temperature_2m_max[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min[i] ?? 0),
      code,
      label: wmo.label,
      emoji: wmo.emoji,
    };
  });
}