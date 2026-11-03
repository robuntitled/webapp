import { getAllegatoBLinkedDraftCopy } from '@/lib/legal/allegato-b-linked';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Compact sidebar variant. */
  compact?: boolean;
};

/**
 * Informativa Allegato B (servizi turistici collegati) — BOZZA da revisione avvocato.
 * Da mostrare prima del pagamento volo/hotel quando c’è il percorso multi-servizio.
 */
export function AllegatoBLinkedNotice({ className, compact = false }: Props) {
  const copy = getAllegatoBLinkedDraftCopy();

  return (
    <aside
      className={cn(
        'rounded-2xl border border-amber-200/80 bg-amber-50/70 text-amber-950',
        compact ? 'px-3 py-2.5 space-y-1.5' : 'px-4 py-3 space-y-2',
        className
      )}
      data-legal-draft="allegato-b-linked"
      aria-label={copy.title}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800/90">
        {copy.banner}
      </p>
      <p className={cn('font-semibold text-slate-900', compact ? 'text-xs' : 'text-sm')}>
        {copy.title}
      </p>
      <div
        className={cn(
          'space-y-1.5 leading-relaxed text-slate-700',
          compact ? 'text-[11px]' : 'text-xs'
        )}
      >
        {copy.paragraphs.map((p) => (
          <p key={p.slice(0, 48)}>{p}</p>
        ))}
      </div>
    </aside>
  );
}
