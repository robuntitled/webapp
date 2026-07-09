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
      className="mb-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="font-semibold">Profilo legale in configurazione</p>
      <p className="mt-1">
        Compila le variabili <code className="text-xs bg-amber-100 px-1 rounded">LEGAL_*</code> in{' '}
        <code className="text-xs bg-amber-100 px-1 rounded">.env.local</code> prima del lancio.
        Vedi <code className="text-xs bg-amber-100 px-1 rounded">.env.example</code>.
      </p>
    </div>
  );
}