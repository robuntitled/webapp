'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitialsFromNames } from '@/lib/utils/user';
import { profilePath } from '@/lib/profile/paths';
import { cn } from '@/lib/utils';

type UserProfileLinkProps = {
  userId?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  /** solo avatar | nome | entrambi */
  mode?: 'avatar' | 'name' | 'both';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  nameClassName?: string;
  subtitle?: string;
  /** stopPropagation utile in liste cliccabili */
  stopPropagation?: boolean;
};

const AVATAR_SIZE = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

/**
 * Link verso profilo pubblico `/u/username`.
 * Se manca username usa fallback `/u/id/:id`.
 */
export function UserProfileLink({
  userId,
  username,
  firstName,
  lastName,
  image,
  mode = 'both',
  size = 'md',
  className,
  nameClassName,
  subtitle,
  stopPropagation,
}: UserProfileLinkProps) {
  const href = profilePath(username, userId ?? undefined);
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    (username ? `@${username}` : 'Viaggiatore');

  const content = (
    <>
      {(mode === 'avatar' || mode === 'both') && (
        <Avatar className={cn(AVATAR_SIZE[size], 'shrink-0 ring-2 ring-background')}>
          <AvatarImage src={image ?? ''} alt={displayName} />
          <AvatarFallback className="text-[10px]">
            {getInitialsFromNames(firstName, lastName)}
          </AvatarFallback>
        </Avatar>
      )}
      {(mode === 'name' || mode === 'both') && (
        <span className="min-w-0 text-left">
          <span
            className={cn(
              'block truncate font-medium hover:underline underline-offset-2',
              nameClassName
            )}
          >
            {displayName}
          </span>
          {subtitle ? (
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
          ) : username && mode === 'both' ? (
            <span className="block truncate text-xs text-muted-foreground">@{username}</span>
          ) : null}
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <span className={cn('inline-flex items-center gap-2.5', className)}>{content}</span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
      title={`Profilo di ${displayName}`}
    >
      {content}
    </Link>
  );
}
