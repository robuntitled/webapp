import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Compass,
  MapPin,
  Palmtree,
  Star,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VerifiedBadges } from '@/components/profile/VerifiedBadges';
import { LeaveReviewForm } from '@/components/profile/LeaveReviewForm';
import { DEFAULT_TRIP_IMAGE, BRAND_IMAGES } from '@/lib/brand/images';
import { formatTripDate } from '@/lib/utils/trip';
import { getInitialsFromNames } from '@/lib/utils/user';
import { profilePath } from '@/lib/profile/paths';
import type {
  PublicProfile,
  PublicProfileReview,
  PublicProfileTrip,
} from '@/lib/data/public-profile';
import type { FeedPost } from '@/lib/data/posts';
import { CreatePostComposer } from '@/components/social/CreatePostComposer';
import { PostFeed } from '@/components/social/PostFeed';
import { cn } from '@/lib/utils';

type PublicProfileViewProps = {
  profile: PublicProfile;
  organizedTrips: PublicProfileTrip[];
  joinedTrips: PublicProfileTrip[];
  reviews: PublicProfileReview[];
  posts?: FeedPost[];
  viewerId?: string | null;
  isOwn?: boolean;
  canReview?: boolean;
};

function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} su 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            cls,
            n <= Math.round(value)
              ? 'fill-amber-500 text-amber-500'
              : 'text-stone-300'
          )}
        />
      ))}
    </span>
  );
}

function TripStrip({ trip }: { trip: PublicProfileTrip }) {
  return (
    <Link
      href={`/viaggi/${trip.id}`}
      className="group relative block overflow-hidden rounded-2xl ring-1 ring-black/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <p className="font-display text-base font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] line-clamp-1">
            {trip.title}
          </p>
          <p className="mt-0.5 text-xs font-medium text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)] line-clamp-1">
            {trip.destination}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            {formatTripDate(trip.startDate)} · budget orientativo {trip.price}€
          </p>
        </div>
      </div>
    </Link>
  );
}

function TripSection({
  title,
  subtitle,
  icon,
  trips,
  empty,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  trips: PublicProfileTrip[];
  empty: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
            {icon}
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="tabular-nums text-sm font-medium text-muted-foreground">
          {trips.length}
        </span>
      </div>
      {trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripStrip trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PublicProfileView({
  profile,
  organizedTrips,
  joinedTrips,
  reviews,
  posts = [],
  viewerId,
  isOwn,
  canReview,
}: PublicProfileViewProps) {
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    `@${profile.username}`;
  const place = [profile.city, profile.country].filter(Boolean).join(', ');
  const heroSrc =
    organizedTrips[0]?.imageUrl ||
    joinedTrips[0]?.imageUrl ||
    BRAND_IMAGES.heroes.dashboard;

  const stats = [
    {
      label: 'Valutazione',
      value:
        profile.ratingAvg != null ? profile.ratingAvg.toFixed(1) : '—',
      hint:
        profile.ratingCount > 0
          ? `${profile.ratingCount} recensioni`
          : 'Nessuna ancora',
      icon: <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />,
    },
    {
      label: 'Organizza',
      value: String(profile.tripsOrganized),
      hint: 'viaggi creati',
      icon: <Compass className="h-3.5 w-3.5 text-teal-700" />,
    },
    {
      label: 'Partecipa',
      value: String(profile.tripsJoined),
      hint: 'crew join',
      icon: <Palmtree className="h-3.5 w-3.5 text-amber-700" />,
    },
    {
      label: 'Trust',
      value: profile.phoneVerified ? 'OK' : '—',
      hint: profile.phoneVerified ? 'ID verificato' : 'Da verificare',
      icon: <Sparkles className="h-3.5 w-3.5 text-sky-700" />,
    },
  ];

  return (
    <div className="relative min-h-[70vh] bg-background pb-28">
      <div className="relative h-[38vh] min-h-[240px] max-h-[360px] w-full overflow-hidden">
        <Image
          src={heroSrc}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="nl-profile-hero-fade absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4">
        <article className="nl-dossier -mt-28 rounded-[10px] px-5 py-6 sm:-mt-32 sm:px-8 sm:py-8">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <Avatar className="-mt-14 h-24 w-24 ring-[4px] ring-[oklch(0.995_0.008_85)] shadow-[0_12px_32px_rgba(40,28,12,0.28)] sm:-mt-16 sm:h-28 sm:w-28">
                  <AvatarImage src={profile.image ?? ''} alt={displayName} />
                  <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                    {getInitialsFromNames(profile.firstName, profile.lastName)}
                  </AvatarFallback>
                </Avatar>
                {profile.phoneVerified ? (
                  <span
                    className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-white shadow-md"
                    title="Telefono verificato"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800/80">
                  Profilo viaggiatore
                </p>
                <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm font-medium text-stone-600">
                  @{profile.username}
                </p>
                {place ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                    {place}
                  </p>
                ) : null}
                <div className="mt-3 h-px w-10 bg-accent" />
                <div className="mt-3">
                  <VerifiedBadges
                    phoneVerified={profile.phoneVerified}
                    emailVerified={profile.emailVerified}
                    size="md"
                    showLabels
                  />
                </div>
              </div>
            </div>

            {isOwn ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Link href="/dashboard/profilo">Modifica profilo</Link>
              </Button>
            ) : null}
          </header>

          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="nl-dossier-stat rounded-2xl px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                  {stat.icon}
                  {stat.label}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="text-[11px] font-medium text-stone-600">{stat.hint}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="mt-5 space-y-5">
          <section className="nl-dossier space-y-4 rounded-[10px] px-5 py-6 sm:px-8 sm:py-7">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Diario
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Post e foto dal profilo
              </p>
            </div>
            {isOwn ? (
              <CreatePostComposer
                compact
                placeholder="Condividi un momento dal viaggio…"
              />
            ) : null}
            <PostFeed
              posts={posts}
              currentUserId={viewerId}
              showSponsors={false}
              emptyMessage={
                isOwn
                  ? 'Non hai ancora pubblicato nulla. Scrivi il primo post.'
                  : 'Nessun post pubblico ancora.'
              }
            />
          </section>

          <section className="nl-dossier space-y-10 rounded-[10px] px-5 py-6 sm:px-8 sm:py-7">
            <TripSection
              title="Organizza"
              subtitle="Viaggi aperti creati da questa persona"
              icon={<Compass className="h-5 w-5 text-teal-700" />}
              trips={organizedTrips}
              empty="Nessun viaggio creato in programma."
            />

            <TripSection
              title="Partecipa"
              subtitle="Crew a cui si è unita"
              icon={<Palmtree className="h-5 w-5 text-amber-700" />}
              trips={joinedTrips}
              empty="Nessuna partecipazione pubblica in programma."
            />
          </section>

          <section className="nl-dossier space-y-5 rounded-[10px] px-5 py-6 sm:px-8 sm:py-7">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Recensioni
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Feedback da chi ha viaggiato insieme
              </p>
              {profile.ratingAvg != null ? (
                <div className="mt-3 flex items-center gap-2">
                  <Stars value={profile.ratingAvg} />
                  <span className="text-sm font-medium text-stone-700">
                    {profile.ratingAvg.toFixed(1)} · {profile.ratingCount}{' '}
                    {profile.ratingCount === 1 ? 'recensione' : 'recensioni'}
                  </span>
                </div>
              ) : null}
            </div>

            {canReview ? (
              <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-5">
                <LeaveReviewForm
                  revieweeId={profile.id}
                  revieweeName={profile.firstName || displayName}
                />
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                Ancora nessuna recensione.
              </p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((review) => {
                  const name =
                    [review.reviewer.firstName, review.reviewer.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                    (review.reviewer.username
                      ? `@${review.reviewer.username}`
                      : 'Viaggiatore');
                  const href = profilePath(
                    review.reviewer.username,
                    review.reviewer.id
                  );
                  return (
                    <li
                      key={review.id}
                      className="rounded-2xl border border-stone-200/80 bg-white/75 p-4"
                    >
                      <div className="flex items-start gap-3">
                        {href ? (
                          <Link href={href} className="shrink-0">
                            <Avatar className="h-10 w-10 ring-1 ring-stone-200">
                              <AvatarImage src={review.reviewer.image ?? ''} alt="" />
                              <AvatarFallback className="text-xs">
                                {getInitialsFromNames(
                                  review.reviewer.firstName,
                                  review.reviewer.lastName
                                )}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        ) : (
                          <Avatar className="h-10 w-10 ring-1 ring-stone-200">
                            <AvatarImage src={review.reviewer.image ?? ''} alt="" />
                            <AvatarFallback className="text-xs">?</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {href ? (
                              <Link
                                href={href}
                                className="text-sm font-semibold text-foreground hover:underline"
                              >
                                {name}
                              </Link>
                            ) : (
                              <span className="text-sm font-semibold text-foreground">
                                {name}
                              </span>
                            )}
                            <Stars value={review.rating} size="sm" />
                          </div>
                          {review.tripTitle ? (
                            <p className="mt-0.5 text-[11px] font-medium text-stone-600">
                              su {review.tripTitle}
                            </p>
                          ) : null}
                          <p className="mt-2 text-sm leading-relaxed text-stone-800">
                            {review.body}
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
