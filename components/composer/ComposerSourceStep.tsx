'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { TRIP_TEMPLATES, type TripTemplate } from '@/lib/composer/trip-templates';
import { coverForDestination } from '@/lib/composer/destination-covers';

type ComposerSourceStepProps = {
  onScratch: () => void;
  onTemplate: (template: TripTemplate) => void;
};

export function ComposerSourceStep({ onScratch, onTemplate }: ComposerSourceStepProps) {
  return (
    <div className="mx-auto max-w-4xl pb-16">
      <p className="text-center text-sm font-medium uppercase tracking-[0.2em] text-accent">
        Crea
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-center font-display text-4xl font-semibold text-white md:text-5xl">
        Scegli la meta. L’itinerario è già pronto.
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-center text-white/85">
        Un modello, tre minuti, poi lo pieghi alle tue date. Da zero solo se vuoi disegnare ogni
        tappa.
      </p>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-white">Scegli un template</h2>
        <Button type="button" variant="outline" className="rounded-full" onClick={onScratch}>
          Crea da zero
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {TRIP_TEMPLATES.map((tpl) => {
          const cover = coverForDestination(tpl.destinationId);
          return (
            <article
              key={tpl.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]"
            >
              <div className="relative h-44">
                <Image
                  src={cover}
                  alt={tpl.label}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
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
                <p className="text-xs text-white/60">{tpl.durationDays} giorni già strutturati</p>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onTemplate(tpl)}
                >
                  Usa template
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
