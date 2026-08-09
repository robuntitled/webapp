import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { SponsoredCreative } from '@/lib/ads/types';
import { cn } from '@/lib/utils';

type SponsoredFeedCardProps = {
  ad: SponsoredCreative;
  tone?: 'default' | 'onDark';
};

export function SponsoredFeedCard({
  ad,
  tone = 'default',
}: SponsoredFeedCardProps) {
  const onDark = tone === 'onDark';
  const initial = ad.avatarInitial ?? ad.advertiser.slice(0, 1).toUpperCase();

  return (
    <article
      className={cn(
        'rounded-3xl p-4 sm:p-5',
        onDark ? 'nl-feed-card' : 'border border-border/60 bg-card'
      )}
      data-sponsored="true"
    >
      <div className="flex items-start gap-3">
        <Avatar
          className={cn(
            'h-11 w-11 shrink-0 ring-2',
            onDark ? 'ring-accent/40' : 'ring-primary/30'
          )}
        >
          <AvatarFallback
            className={cn(
              'text-xs font-semibold',
              onDark ? 'bg-accent/20 text-accent' : 'bg-primary/10 text-primary'
            )}
          >
            {initial}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-sm font-semibold',
                  onDark ? 'text-white' : 'text-foreground'
                )}
              >
                {ad.advertiser}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-[11px] font-medium uppercase tracking-wide',
                  onDark ? 'text-accent/90' : 'text-primary'
                )}
              >
                Sponsorizzato
              </p>
            </div>
          </div>

          <p
            className={cn(
              'mt-3 text-[15px] font-semibold leading-snug',
              onDark ? 'text-white' : 'text-foreground'
            )}
          >
            {ad.headline}
          </p>
          <p
            className={cn(
              'mt-1.5 text-[15px] leading-relaxed',
              onDark ? 'text-white/75' : 'text-muted-foreground'
            )}
          >
            {ad.body}
          </p>

          <Link
            href={ad.href}
            className={cn(
              'mt-3 block overflow-hidden rounded-2xl transition',
              onDark
                ? 'ring-1 ring-white/10 hover:ring-accent/40'
                : 'border border-black/5 hover:border-primary/30'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.imageUrl}
              alt=""
              className="max-h-[280px] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </Link>

          <div className="mt-3.5">
            <Link
              href={ad.href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition',
                onDark
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {ad.cta}
              <ArrowRight className="h-3.5 w-3.5 opacity-80" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
