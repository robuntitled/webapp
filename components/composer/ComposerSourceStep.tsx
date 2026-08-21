'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { TRIP_TEMPLATES, type TripTemplate } from '@/lib/composer/trip-templates';
import { activeCatalogDestinations } from '@/lib/catalog/destinations';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { DESTINATION_REGIONS } from '@/lib/composer/destinations';

type ComposerSourceStepProps = {
  onTemplate: (template: TripTemplate) => void;
};

function TemplateCover({ tpl }: { tpl: TripTemplate }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0" style={{ background: tpl.gradient }}>
      {!failed ? (
        <Image
          src={coverForDestination(tpl.destinationId)}
          alt={tpl.label}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl">{tpl.emoji}</div>
      )}
    </div>
  );
}

export function ComposerSourceStep({ onTemplate }: ComposerSourceStepProps) {
  const [region, setRegion] = useState<string>('Tutte');
  const activeDestIds = useMemo(
    () => new Set(activeCatalogDestinations().map((d) => d.id)),
    []
  );
  const templates = useMemo(
    () =>
      TRIP_TEMPLATES.filter((t) => activeDestIds.has(t.destinationId)).filter(
        (t) => region === 'Tutte' || t.region === region
      ),
    [activeDestIds, region]
  );

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-accent">
        Crea
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-center font-display text-4xl font-semibold text-white md:text-5xl">
        Destinazione e durata. Itinerario già pronto.
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-center text-white/85">
        Scegli meta e giorni. Poi date, partenza da Italia e posti. Niente composer da zero.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {['Tutte', ...DESTINATION_REGIONS].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRegion(r)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              region === r
                ? 'bg-accent text-[#0b1220]'
                : 'border border-white/15 bg-white/8 text-white/80 hover:bg-white/12'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold text-white">Template per durata</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {templates.map((tpl) => (
          <article
            key={tpl.id}
            className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]"
          >
            <div className="relative h-44">
              <TemplateCover tpl={tpl} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                {tpl.region}
              </p>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-display text-2xl font-semibold text-white">
                  {tpl.emoji} {tpl.label}
                </h3>
                <p className="mt-0.5 text-sm text-white/85">{tpl.vibe}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-white/60">{tpl.durationDays} giorni · hotel modo A</p>
              <Button type="button" size="sm" className="rounded-full" onClick={() => onTemplate(tpl)}>
                Scegli
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
