import Image from 'next/image';
import { cn } from '@/lib/utils';

export function PhotoChoiceCard({
  cover,
  active,
  onClick,
  kicker,
  title,
  body,
  className,
}: {
  cover: string;
  active?: boolean;
  onClick?: () => void;
  kicker?: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative min-h-[210px] overflow-hidden rounded-3xl text-left shadow-[0_20px_40px_-24px_rgba(0,0,0,0.55)] transition duration-300',
        active
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-white'
          : 'ring-1 ring-slate-200',
        className
      )}
    >
      <Image
        src={cover}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 33vw"
        className="object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
      <div className="relative z-10 flex h-full min-h-[210px] flex-col justify-end p-5">
        {kicker ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent drop-shadow">
            {kicker}
          </p>
        ) : null}
        <p className="mt-1 font-display text-2xl font-semibold text-white drop-shadow">{title}</p>
        {body ? <p className="mt-1 text-sm text-white/95 drop-shadow">{body}</p> : null}
      </div>
    </button>
  );
}
