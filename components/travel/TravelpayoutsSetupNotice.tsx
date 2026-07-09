import { Card, CardContent } from '@/components/ui/card';
import { TRAVELPAYOUTS_BRAND_COLORS } from '@/lib/travelpayouts/config';
import { ExternalLink, Settings2 } from 'lucide-react';

export function TravelpayoutsSetupNotice() {
  return (
    <Card className="rounded-2xl border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Settings2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-display text-lg font-semibold">Configura Travelpayouts White Label</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Aggiungi le variabili in <code className="text-xs">.env.local</code> dopo aver creato
              il White Label nel pannello Travelpayouts. Per il tipo <strong>Page</strong>, imposta
              un CNAME (es. <code className="text-xs">ricerca.tuodominio.it</code>) verso
              l&apos;host indicato da Travelpayouts — il certificato SSL può richiedere fino a 48h.
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>
                <code className="text-xs">TRAVELPAYOUTS_API_TOKEN</code> — Data API (funziona senza
                dominio, stima prezzi in creazione viaggio)
              </li>
              <li>
                <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID</code> — Widget ricerca
                (senza dominio, funziona su localhost)
              </li>
              <li>
                <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER</code> +{' '}
                <code className="text-xs">FLIGHTS_DOMAIN</code> — White Label Page (serve dominio)
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Colori brand per il pannello WL: primario {TRAVELPAYOUTS_BRAND_COLORS.primary},
              accento {TRAVELPAYOUTS_BRAND_COLORS.accent}
            </p>
            <a
              href="https://app.travelpayouts.com/whitelabels/web"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Apri dashboard White Label
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}