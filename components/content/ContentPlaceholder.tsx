import type { ReactNode } from 'react';

/**
 * Visual marker for unresolved copy placeholders like `{venditore}`.
 * Do not invent company/email/VAT values — keep the token literal.
 */
export function ContentPlaceholder({ children }: { children: ReactNode }) {
  return (
    <span
      className="nl-content-placeholder inline rounded-md bg-amber-100/90 px-1.5 py-0.5 font-mono text-[0.92em] font-semibold text-amber-950 ring-1 ring-amber-300/70"
      data-placeholder="true"
    >
      {children}
    </span>
  );
}

/** Split a string on `{token}` and wrap each token in ContentPlaceholder. */
export function withPlaceholders(text: string): ReactNode {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, i) => {
    if (/^\{[^}]+\}$/.test(part)) {
      return <ContentPlaceholder key={`ph-${i}`}>{part}</ContentPlaceholder>;
    }
    return part;
  });
}
