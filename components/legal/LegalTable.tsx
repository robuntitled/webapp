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
        'mt-1 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40 shadow-inner',
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
      <tr className="border-b border-slate-200/90 bg-white text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {children}
      </tr>
    </thead>
  );
}

export function LegalTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-200/60 bg-white">{children}</tbody>;
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
        'px-4 py-4 align-top text-slate-600',
        mono && 'font-mono text-xs font-medium text-slate-800',
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
  return <th className={cn('px-4 py-3.5 font-bold', className)}>{children}</th>;
}
