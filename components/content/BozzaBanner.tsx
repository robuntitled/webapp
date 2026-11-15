import type { ReactNode } from 'react';

type BozzaBannerProps = {
  /** Extra line under the BOZZA label */
  children?: ReactNode;
  /** Stronger “do not publish” wording for draft-only docs */
  draftOnly?: boolean;
};

/**
 * Prominent legal-draft marker. Never invent contact/legal data to “complete” the page.
 */
export function BozzaBanner({ children, draftOnly = false }: BozzaBannerProps) {
  return (
    <div
      className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      data-testid="bozza-banner"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-900">
        BOZZA
        {draftOnly ? ' · non pubblicare' : ' · da rilettura legale'}
      </p>
      {children ? <div className="mt-1.5 leading-relaxed text-amber-950/90">{children}</div> : null}
    </div>
  );
}
