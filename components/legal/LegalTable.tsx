import { cn } from '@/lib/utils';

export function LegalTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.02]',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
}

export function LegalTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {children}
      </tr>
    </thead>
  );
}

export function LegalTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function LegalTableCell({
  children,
  mono,
  className,
}: {
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 align-top text-slate-700',
        mono && 'font-mono text-xs text-slate-800',
        className
      )}
    >
      {children}
    </td>
  );
}

export function LegalTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn('px-4 py-3 font-medium', className)}>{children}</th>;
}
