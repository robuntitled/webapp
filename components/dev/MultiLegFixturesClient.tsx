'use client';

import { useState } from 'react';
import { format, subYears } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarDays, Pencil, Plane, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const LEGS = [
  {
    id: 'out',
    kind: 'Andata',
    route: 'MXP → KEF',
    when: 'ven 13 nov · 06:10–09:50',
    meta: 'Diretto · 4 h 40 min · Wizz Air Malta',
    price: '50,00 €',
    status: 'Da prenotare' as const,
  },
  {
    id: 'ret',
    kind: 'Rientro',
    route: 'KEF → MXP',
    when: 'mer 18 nov · 10:30–15:40',
    meta: 'Diretto · 4 h 10 min · Wizz Air Malta',
    price: '57,00 €',
    status: 'Da prenotare' as const,
  },
];

export function MultiLegFixturesClient() {
  const [separate, setSeparate] = useState(false);
  const [dobOpen, setDobOpen] = useState(true);
  const [dob, setDob] = useState<Date | undefined>(new Date(1996, 9, 31));

  return (
    <div className="mx-auto max-w-[390px] space-y-10 bg-[var(--color-tint,#f8fafc)] px-3 py-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Preview fixtures · non produzione
        </p>
        <h1 className="font-display text-xl font-semibold text-slate-900">
          Multi-leg + calendario
        </h1>
      </header>

      {/* A) Checkout summary: all legs + total */}
      <section
        className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="fixture-checkout-summary"
      >
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Riepilogo checkout
          </p>
        </div>
        {LEGS.map((leg) => (
          <div
            key={leg.id}
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {leg.kind} · {leg.route}
            </p>
            <p className="mt-1 text-xs text-slate-600">{leg.when}</p>
            <p className="text-xs text-slate-500">{leg.meta}</p>
            <p className="mt-2 text-right text-sm font-bold tabular-nums">{leg.price}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
          <p className="text-[11px] uppercase tracking-wider text-white/70">Totale tratte</p>
          <p className="font-display text-2xl font-semibold">107,00 EUR</p>
          <p className="text-[11px] text-white/60">1 passeggero · 2 tratte (biglietti one-way)</p>
        </div>
      </section>

      {/* B) Separate-legs option on trip Voli */}
      <section
        className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="fixture-separate-legs"
      >
        <p className="text-sm font-bold text-slate-900">Voli · tratte</p>
        <ul className="space-y-2.5">
          {LEGS.map((leg) => (
            <li
              key={leg.id}
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {leg.kind}
                    </p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200">
                      {leg.status}
                    </span>
                  </div>
                  <p className="mt-0.5 font-display text-base font-semibold">{leg.route}</p>
                  <p className="text-xs text-slate-500">{leg.when}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold">{leg.price}</p>
                  {separate ? (
                    <Button size="sm" className="mt-2 h-9 rounded-full px-3 text-xs">
                      Prenota
                    </Button>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                      Modifica
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={separate}
            onChange={(e) => setSeparate(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Paga tratte separatamente
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              Di default le paghi insieme. Attiva per Prenota su ogni tratta.
            </span>
          </span>
        </label>
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Chi paga</h3>
          </div>
          {!separate ? (
            <Button className="min-h-11 w-full rounded-full">Pago per me · 107,00 €</Button>
          ) : (
            <p className="text-[11px] text-slate-500">Usa Prenota su ogni tratta qui sopra.</p>
          )}
          <Button variant="outline" className="min-h-11 w-full rounded-full">
            Pago per altri
          </Button>
        </div>
      </section>

      {/* C) Calendar month/year dropdowns open */}
      <section
        className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="fixture-calendar"
      >
        <p className="text-sm font-bold text-slate-900">Data di nascita</p>
        <Popover open={dobOpen} onOpenChange={setDobOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-12 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium'
              )}
            >
              <CalendarDays className="h-4 w-4 text-primary" />
              {dob ? format(dob, 'd MMMM yyyy', { locale: it }) : 'Seleziona data'}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="z-[80] w-auto overflow-visible rounded-2xl border-slate-200 p-0 shadow-xl"
          >
            <Calendar
              mode="single"
              locale={it}
              captionLayout="dropdown"
              selected={dob}
              defaultMonth={dob ?? subYears(new Date(), 30)}
              startMonth={new Date(1920, 0)}
              endMonth={new Date(new Date().getFullYear() - 12, 11)}
              onSelect={(d) => {
                if (!d) return;
                setDob(d);
              }}
              className="p-3"
            />
          </PopoverContent>
        </Popover>
      </section>
    </div>
  );
}
