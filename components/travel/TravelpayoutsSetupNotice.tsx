import { Card, CardContent } from '@/components/ui/card';
import { TRAVELPAYOUTS_BRAND_COLORS } from '@/lib/travelpayouts/config';
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
              Senza queste variabili su <strong>Vercel</strong> (e in <code className="text-xs">.env.local</code>)
              la ricerca voli/hotel e le stime prezzo non funzionano.
            </p>

            <div className="rounded-xl bg-background/80 border p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Minimo per partire (5 minuti)</p>
              <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1.5">
                <li>
                  Iscriviti al programma <strong>Aviasales</strong> su{' '}
                  <a
                    href="https://www.travelpayouts.com/programs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    travelpayouts.com/programs
                  </a>
                </li>
                <li>
                  Copia il <strong>Partner ID (marker)</strong> dalla dashboard → Tools → API token
                </li>
                <li>
                  Aggiungi su Vercel:{' '}
                  <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=il_tuo_id</code>
                </li>
                <li>
                  Aggiungi anche:{' '}
                  <code className="text-xs">TRAVELPAYOUTS_API_TOKEN=il_token_api</code> (stesse pagina
                  API)
                </li>
                <li>Redeploy del sito</li>
              </ol>
            </div>

            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>
                <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER</code> — link affiliate
                voli (Aviasales) e hotel (Hotellook) via tp.media
              </li>
              <li>
                <code className="text-xs">TRAVELPAYOUTS_API_TOKEN</code> — stime prezzo volo in cache
                nel composer e radar
              </li>
              <li>
                <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID</code> — widget integrato
                (opzionale, senza dominio)
              </li>
              <li>
                <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_FLIGHTS_DOMAIN</code> — White
                Label su sottodominio (opzionale, massima brandizzazione)
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              URL da registrare su Travelpayouts:{' '}
              <code className="text-[11px]">https://webapp-bice-six-42.vercel.app</code>
              <br />
              Colori WL: primario {TRAVELPAYOUTS_BRAND_COLORS.primary}, accento{' '}
              {TRAVELPAYOUTS_BRAND_COLORS.accent}
            </p>

            <a
              href="https://www.travelpayouts.com/developers/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Apri API &amp; Partner ID
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}