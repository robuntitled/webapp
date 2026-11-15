'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MoreHorizontal, Trash2, ExternalLink, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { deleteOrLeavePracticeAction } from '@/actions/practices';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import {
  hubBadgeClassName,
  resolveHubTripBadge,
} from '@/lib/itineraries/hub-trip-status';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';
import { parseFlightStatus } from '@/lib/itineraries/bookings';
import { listPracticeFlightBookings } from '@/lib/itineraries/practice-flights';
import type { HubPracticeCard } from '@/lib/itineraries/pratiche-hub-types';
import { cn } from '@/lib/utils';

export function PracticeTripCard({
  practice,
  index,
  onRemoved,
}: {
  practice: HubPracticeCard;
  index: number;
  onRemoved?: (practiceId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const tpl = findItineraryTemplate(practice.template_id);
  const title =
    practice.hubTitle?.trim() ||
    tpl?.destination_name ||
    practice.destination_label ||
    'Il tuo viaggio';
  const badge = resolveHubTripBadge(practice);
  const carrierCancelled = listPracticeFlightBookings(practice).some(
    (b) => parseFlightStatus(b.status) === 'cancelled'
  );
  const isCreator = practice.organizedByMe !== false;
  const copy = DASHBOARD_VIAGGI_COPY;

  function runDeleteOrLeave() {
    startTransition(async () => {
      const res = await deleteOrLeavePracticeAction(practice.id);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      onRemoved?.(practice.id);
      if (res.mode === 'hard_deleted') toast.success(copy.toast.deleted);
      else if (res.mode === 'transferred_and_left') toast.message(copy.toast.creatorTransferred);
      else toast.message(copy.toast.left);
    });
  }

  return (
    <article
      className="overflow-hidden rounded-[28px] border border-border bg-white shadow-sm"
      data-testid={`pratiche-card-${practice.id}`}
    >
      <div className="relative">
        <Link
          href={`/pratica/${practice.id}`}
          className="block"
          aria-label={`Apri ${title}`}
        >
          <div className="relative h-48 sm:h-52">
            <Image
              src={uniqueCover(
                tpl?.destination_slug ?? practice.destination_label ?? practice.template_id ?? 'viaggio',
                index
              )}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
        </Link>

        {/* Menu fuori dal Link (Kr: ⋯ non dentro <Link>) */}
        <div className="absolute right-3 top-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
                aria-label={copy.menu.open}
                data-testid={`pratiche-card-menu-${practice.id}`}
                disabled={pending}
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuItem asChild>
                <Link href={`/pratica/${practice.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                  {copy.menu.openTrip}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/pratica/${practice.id}/prossimo`}>
                  {copy.menu.invite}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-rose-700 focus:text-rose-800"
                disabled={pending}
                onSelect={(e) => {
                  e.preventDefault();
                  runDeleteOrLeave();
                }}
              >
                {isCreator ? (
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                ) : (
                  <UserMinus className="mr-2 h-4 w-4" aria-hidden />
                )}
                {isCreator ? copy.menu.delete : copy.menu.leave}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span
          className={cn(
            'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
            hubBadgeClassName(badge.tone)
          )}
          data-testid={`pratiche-badge-${practice.id}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Titolo SOTTO la foto */}
      <div className="space-y-2 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/pratica/${practice.id}`}
              className="line-clamp-2 font-display text-xl font-semibold text-foreground hover:text-primary"
            >
              {title}
              {tpl ? ` · ${tpl.duration_days} giorni` : ''}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatItDate(practice.date_from)} – {formatItDate(practice.date_to)}
            </p>
          </div>
        </div>

        {carrierCancelled ? (
          <p
            className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600"
            data-testid={`pratiche-ce261-${practice.id}`}
          >
            {copy.carrierCancelledNote}
          </p>
        ) : null}
      </div>
    </article>
  );
}
