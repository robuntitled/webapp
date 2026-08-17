'use client';

import { PenLine, Sparkles, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TRIP_TEMPLATES, type TripTemplate } from '@/lib/composer/trip-templates';
import { cn } from '@/lib/utils';

type ComposerSourceStepProps = {
  onScratch: () => void;
  onTemplate: (template: TripTemplate) => void;
  onCustomize: (template: TripTemplate) => void;
};

export function ComposerSourceStep({
  onScratch,
  onTemplate,
  onCustomize,
}: ComposerSourceStepProps) {
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Percorso crea</p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-white md:text-5xl">
        Come lo costruisci?
      </h1>
      <p className="mt-4 max-w-xl text-white/70">
        I template sono la via principale: itinerario già strutturato, poi lo adatti. Da zero solo se
        vuoi il controllo totale.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <ModeHint
          icon={LayoutTemplate}
          title="Template"
          body="Parti da una meta già disegnata."
          featured
        />
        <ModeHint icon={Sparkles} title="Modifica template" body="Prendi la base e cambia giorni." />
        <ModeHint icon={PenLine} title="Da zero" body="Destinazione, date, mappa: tutto tu." />
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-white">Scegli un template</h2>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
          onClick={onScratch}
        >
          Crea da zero
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {TRIP_TEMPLATES.map((tpl) => (
          <article
            key={tpl.id}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
          >
            <div className={cn('mb-4 h-16 rounded-2xl bg-gradient-to-br', tpl.gradient)} />
            <p className="text-xs uppercase tracking-wider text-white/45">{tpl.region}</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-white">
              {tpl.emoji} {tpl.label}
            </h3>
            <p className="mt-1 text-sm text-white/60">{tpl.vibe}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => onTemplate(tpl)}
              >
                Usa template
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-white/15 text-white hover:bg-white/10"
                onClick={() => onCustomize(tpl)}
              >
                Modifica
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ModeHint({
  icon: Icon,
  title,
  body,
  featured,
}: {
  icon: typeof PenLine;
  title: string;
  body: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3',
        featured ? 'border-accent/40 bg-accent/10' : 'border-white/10 bg-white/[0.03]'
      )}
    >
      <Icon className={cn('h-4 w-4', featured ? 'text-accent' : 'text-white/50')} />
      <p className="mt-2 text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/55">{body}</p>
    </div>
  );
}
