import Link from 'next/link';
import { Coins, Plane, BedDouble } from 'lucide-react';
import type { CreditsPageData } from '@/lib/data/credits';
import { SettingsSection } from '@/components/settings/SettingsSection';

function entryLabel(entry: CreditsPageData['ledger'][number]): string {
  if (entry.entryType === 'earn') {
    if (entry.bookingKind === 'hotel') return 'Cashback hotel';
    if (entry.bookingKind === 'flight') return 'Cashback volo';
    return 'Credito prenotazione';
  }
  if (entry.entryType === 'spend') return 'Utilizzo credito';
  if (entry.entryType === 'reversal') return 'Storno';
  return 'Rettifica';
}

function EntryIcon({ kind }: { kind: CreditsPageData['ledger'][number]['bookingKind'] }) {
  if (kind === 'flight') return <Plane className="h-4 w-4 text-primary" />;
  if (kind === 'hotel') return <BedDouble className="h-4 w-4 text-primary" />;
  return <Coins className="h-4 w-4 text-primary" />;
}

export function SettingsCreditsSection({ credits }: { credits: CreditsPageData }) {
  return (
    <SettingsSection
      icon={Coins}
      title="Crediti NomadLink"
      description={`Ricevi circa il ${credits.cashbackPercent}% della nostra commissione come credito sulle prenotazioni hotel e voli in-app.`}
    >
      <div className="rounded-2xl border border-border/70 bg-primary/5 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Saldo disponibile
        </p>
        <p className="mt-1 font-display text-3xl font-semibold text-foreground">
          {credits.balanceFormatted}
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          I crediti si accumulano dopo ogni prenotazione confermata. Presto potrai usarli sul
          prossimo checkout.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/prenota/hotel"
            className="inline-flex h-9 items-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Prenota hotel
          </Link>
          <Link
            href="/prenota/voli"
            className="inline-flex h-9 items-center rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground"
          >
            Prenota voli
          </Link>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-sm font-medium text-foreground">Movimenti recenti</p>
        {credits.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun movimento ancora. Prenota un hotel o un volo per guadagnare credito.
          </p>
        ) : (
          <ul className="divide-y divide-border/70 rounded-2xl border border-border/70 overflow-hidden">
            {credits.ledger.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 bg-background/60 px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <EntryIcon kind={entry.bookingKind} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entryLabel(entry)}
                    {entry.bookingRef ? ` · ${entry.bookingRef}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString('it-IT', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    entry.amountCents > 0 ? 'text-emerald-600' : 'text-foreground'
                  }`}
                >
                  {entry.amountCents > 0 ? '+' : ''}
                  {entry.amountFormatted}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsSection>
  );
}
