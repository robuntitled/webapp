import type { CompanyProfile } from '@/lib/privacy/company';

/**
 * Avviso visibile solo in sviluppo quando il profilo legale non è ancora completo.
 * Non viene mostrato in produzione per non esporre lo stato di configurazione agli utenti.
 */
export function LegalConfigNotice({ company }: { company: CompanyProfile }) {
  if (process.env.NODE_ENV !== 'development' || company.isComplete) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">Profilo legale in configurazione</p>
      <p className="mt-1.5 leading-relaxed text-amber-900/90">
        Compila le variabili <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">LEGAL_*</code> in{' '}
        <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">.env.local</code> prima del lancio.
        Vedi <code className="rounded bg-amber-100/80 px-1.5 py-0.5 text-xs">.env.example</code>.
      </p>
    </div>
  );
}