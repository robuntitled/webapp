import Link from 'next/link';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { listOfficialEditions } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { itineraryPath } from '@/lib/itineraries/params';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

export const dynamic = 'force-dynamic';

export default async function PartenzeIndexPage() {
  const editions = await listOfficialEditions();

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          In gruppo
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Partenze ufficiali</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Date inserite da noi. Niente gruppi pubblici con date libere.{' '}
          {COMPLIANCE_COPY.separateBooking}
        </p>
      </header>
      {editions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna partenza aperta.</p>
      ) : (
        <ul className="space-y-3">
          {editions.map((ed) => {
            const tpl = findItineraryTemplate(ed.template_id);
            return (
              <li key={ed.id} className="rounded-[10px] border border-border bg-card p-4">
                <p className="font-semibold">
                  {tpl?.destination_name ?? ed.template_id}
                  {tpl ? ` · ${tpl.duration_days} giorni` : ''}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatItDate(String(ed.date_from))} – {formatItDate(String(ed.date_to))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ed.confirmed_count ?? 0}/{ed.min_confirmed} voli confermati
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {tpl ? (
                    <Link
                      href={itineraryPath(tpl.destination_slug, tpl.duration_days)}
                      className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
                    >
                      Vedi piano
                    </Link>
                  ) : null}
                  <Link
                    href={`/edizione/${ed.id}`}
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    Dettaglio
                  </Link>
                  {ed.id.startsWith('seed-') ? null : <JoinEditionButton editionId={ed.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
