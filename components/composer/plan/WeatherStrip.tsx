'use client';

import { useEffect, useState } from 'react';
import type { DayWeather } from '@/lib/weather/open-meteo';
import type { ComposerDraft } from '@/types/composer';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { CloudSun, Loader2 } from 'lucide-react';

type WeatherStripProps = {
  draft: ComposerDraft;
  activeDayIndex: number;
};

export function WeatherStrip({ draft, activeDayIndex }: WeatherStripProps) {
  const [weather, setWeather] = useState<DayWeather[]>([]);
  const [loading, setLoading] = useState(false);

  const lat = draft.destinationMeta?.lat;
  const lng = draft.destinationMeta?.lng;

  useEffect(() => {
    if (lat == null || lng == null) return;

    setLoading(true);
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      startDate: draft.startDate,
      endDate: draft.endDate,
    });

    fetch(`/api/weather?${params}`)
      .then((r) => r.json())
      .then((data) => setWeather(data.days ?? []))
      .catch(() => setWeather([]))
      .finally(() => setLoading(false));
  }, [lat, lng, draft.startDate, draft.endDate]);

  const activeDay = draft.days.find((d) => d.dayIndex === activeDayIndex);
  const dayWeather = activeDay
    ? weather.find((w) => w.date === activeDay.date)
    : weather[0];

  if (lat == null || lng == null) return null;

  return (
    <div className="composer-weather-strip rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CloudSun className="h-4 w-4 text-sky-300" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Meteo destinazione
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Caricamento previsioni...
        </div>
      ) : dayWeather ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{dayWeather.emoji}</span>
            <div>
              <p className="font-semibold text-white text-sm">{dayWeather.label}</p>
              <p className="text-[10px] text-white/40 capitalize">
                {activeDay
                  ? format(parseISO(activeDay.date), 'EEE d MMM', { locale: it })
                  : 'Oggi'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white tabular-nums">
              {dayWeather.tempMax}°
              <span className="text-white/40 text-sm font-normal"> / {dayWeather.tempMin}°</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/35">Previsioni non disponibili</p>
      )}

      {weather.length > 1 && (
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none">
          {weather.map((w, i) => {
            const day = draft.days[i];
            const active = day?.dayIndex === activeDayIndex;
            return (
              <div
                key={w.date}
                className={`shrink-0 flex flex-col items-center px-2 py-1.5 rounded-lg text-[10px] ${
                  active ? 'bg-white/10 text-white' : 'text-white/40'
                }`}
              >
                <span>{w.emoji}</span>
                <span className="font-medium tabular-nums">{w.tempMax}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}