import { Card, CardContent } from '@/components/ui/card';
import { TRAVELPAYOUTS_BRAND_COLORS } from '@/lib/travelpayouts/config';
import { REQUIRED_TRAVEL_PROGRAMS } from '@/lib/travelpayouts/setup-hints';
import { ExternalLink, Settings2 } from 'lucide-react';

export function TravelpayoutsSetupNotice() {
  return (
    <Card className="rounded-2xl border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Settings2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold">Attiva gli affiliate Travelpayouts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L&apos;errore <strong>&quot;marker is not subscribed to campaign&quot;</strong> significa che
              il Partner ID non è iscritto al programma (Aviasales o Booking.com). Hotellook è chiuso dal
              2025 — usiamo Booking.com per gli hotel.
            </p>

            <div className="rounded-xl bg-background/80 border p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Setup in 5 minuti</p>
              <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1.5">
                <li>
                  Accedi a{' '}
                  <a
                    href="https://app.travelpayouts.com/programs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    travelpayouts.com/programs
                  </a>
                </li>
                <li>
                  Iscriviti a <strong>Aviasales</strong> (voli) e <strong>Booking.com</strong> (hotel) —
                  attendi approvazione se richiesta
                </li>
                <li>
                  Dashboard → Profile → <strong>API token</strong> → copia il tuo <strong>Partner ID</strong>{' '}
                  (marker) e l&apos;API token
                </li>
                <li>
                  Su Vercel aggiungi:{' '}
                  <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=il_tuo_id</code>
                </li>
                <li>
                  Aggiungi anche:{' '}
                  <code className="text-xs">TRAVELPAYOUTS_API_TOKEN=il_token</code> (stime prezzo opzionali)
                </li>
                <li>Redeploy del sito — non usare l&apos;ID demo del repository</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2">
              {REQUIRED_TRAVEL_PROGRAMS.map((program) => (
                <a
                  key={program.id}
                  href={program.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  {program.name} ({program.purpose})
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>

            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>
                <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER</code> — il tuo Partner ID
                (non quello di altri)
              </li>
              <li>
                <code className="text-xs">TRAVELPAYOUTS_API_TOKEN</code> — stime prezzo volo in cache
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              URL progetto da registrare su Travelpayouts:{' '}
              <code className="text-[11px]">https://webapp-bice-six-42.vercel.app</code>
              <br />
              Colori WL: primario {TRAVELPAYOUTS_BRAND_COLORS.primary}, accento{' '}
              {TRAVELPAYOUTS_BRAND_COLORS.accent}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}