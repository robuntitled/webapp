'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { findTripTemplate, type TripTemplate } from '@/lib/composer/trip-templates';
import { wizardCatalogDestinations, type CatalogDestination } from '@/lib/catalog/destinations';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';

type ComposerSourceStepProps = {
  onTemplate: (template: TripTemplate) => void;
};

function DestinationCover({ dest }: { dest: CatalogDestination }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0" style={{ background: dest.gradient }}>
      {!failed ? (
        <Image
          src={coverForDestination(dest.id)}
          alt={dest.name}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl">{dest.emoji}</div>
      )}
    </div>
  );
}

export function ComposerSourceStep({ onTemplate }: ComposerSourceStepProps) {
  const [region, setRegion] = useState<string>('Tutte');
  const destinations = useMemo(
    () =>
      wizardCatalogDestinations().filter(
        (d) => region === 'Tutte' || d.continent === region
      ),
    [region]
  );

  const pick = (dest: CatalogDestination, durationDays: number) => {
    const tpl = findTripTemplate(`${dest.id}-${durationDays}`);
    if (tpl) onTemplate(tpl);
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-accent">
        Crea
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-center font-display text-4xl font-semibold text-white md:text-5xl">
        Scegli la nazione. Poi i giorni.
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-center text-white/85">
        Tre durate per meta, ponderate da Italia. L’itinerario è già pronto.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
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

      <h2 className="mt-8 font-display text-xl font-semibold text-white">Nazioni</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {destinations.map((dest) => (
          <article
            key={dest.id}
            className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]"
          >
            <div className="relative h-44">
              <DestinationCover dest={dest} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                {dest.continent}
              </p>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-display text-2xl font-semibold text-white">
                  {dest.emoji} {dest.name}
                </h3>
                <p className="mt-0.5 text-sm text-white/85">{dest.vibe}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              {dest.allowedDurations.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/20 bg-white/8 text-white hover:bg-accent hover:text-[#0b1220]"
                  onClick={() => pick(dest, n)}
                >
                  {n} giorni
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
