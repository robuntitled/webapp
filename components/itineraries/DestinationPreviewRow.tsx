'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type Dest = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  allowedDurations: number[];
  continent?: string;
  published?: boolean;
};

/** Riga lista con preview: niente card full-bleed zoomate. */
export function DestinationPreviewRow({
  dest,
  cover,
  highlightDuration,
  onPickDuration,
}: {
  dest: Dest;
  cover: string;
  highlightDuration?: number | null;
  onPickDuration: (days: number) => void;
}) {
  const durations =
    highlightDuration != null && dest.allowedDurations.includes(highlightDuration)
      ? [
          highlightDuration,
          ...dest.allowedDurations.filter((d) => d !== highlightDuration),
        ]
      : dest.allowedDurations;

  return (
    <article
      className={cn(
        'group flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/75 p-2.5',
        'transition hover:border-white/25 hover:bg-[#121a2b]'
      )}
    >
      <div className="relative h-[4.75rem] w-[6.5rem] shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36">
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="144px"
        />
        <p className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          {dest.continent ?? 'Meta'}
        </p>
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="font-display text-lg font-semibold leading-tight text-white sm:text-xl">
            {dest.emoji} {dest.name}
          </h3>
          {dest.published === false ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              Presto
            </span>
          ) : dest.published ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-accent">
              Aperta
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-white/70">{dest.vibe}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {durations.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPickDuration(n)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition sm:text-sm',
                highlightDuration === n
                  ? 'bg-accent text-[#0b1220]'
                  : 'border border-white/20 bg-white/8 text-white hover:bg-accent hover:text-[#0b1220]'
              )}
            >
              {n} giorni
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
