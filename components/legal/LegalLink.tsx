import Link from 'next/link';
import { cn } from '@/lib/utils';

const linkClass =
  'font-medium text-primary underline decoration-primary/25 underline-offset-[3px] transition hover:text-[var(--color-primary-hover)] hover:decoration-primary/60';

export function LegalLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  if (external || href.startsWith('mailto:')) {
    return (
      <a
        href={href}
        className={cn(linkClass, className)}
        {...(external && !href.startsWith('mailto:')
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(linkClass, className)}>
      {children}
    </Link>
  );
}
