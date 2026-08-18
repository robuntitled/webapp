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
              ? 'fill-amber-400 text-amber-400'
              : 'text-white/20'
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
      className="group relative block overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <p className="font-display text-base font-semibold text-white line-clamp-1">
            {trip.title}
          </p>
          <p className="mt-0.5 text-xs text-white/70 line-clamp-1">{trip.destination}</p>
          <p className="mt-1.5 text-[11px] text-white/55">
            {formatTripDate(trip.startDate)} · {trip.price}€
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
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white">
            {icon}
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        </div>
        <span className="tabular-nums text-sm text-white/40">{trips.length}</span>
      </div>
      {trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
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

  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-[#0c1520] pb-28 text-white">
      {/* Full-bleed atmosphere */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden">
        <Image
          src={heroSrc}
          alt=""
          fill
          priority
          className="object-cover scale-105 blur-[2px]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#0c1520]/85 to-[#0c1520]" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 20% 0%, oklch(0.45 0.1 220 / 0.55), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 20%, oklch(0.62 0.14 45 / 0.4), transparent 55%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 pt-10 sm:pt-14">
        {/* Hero identity */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4 sm:gap-5">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-accent/70 via-teal-400/40 to-primary/50 opacity-80 blur-sm" />
              <Avatar className="relative h-28 w-28 border-[3px] border-white/20 shadow-2xl sm:h-32 sm:w-32">
                <AvatarImage src={profile.image ?? ''} alt={displayName} />
                <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                  {getInitialsFromNames(profile.firstName, profile.lastName)}
                </AvatarFallback>
              </Avatar>
              {profile.phoneVerified ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-sky-500 text-white shadow-lg"
                  title="Telefono verificato"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>

            <div className="min-w-0 pb-1">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {displayName}
              </h1>
              <p className="mt-0.5 text-sm text-white/55">@{profile.username}</p>
              {place ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/65">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {place}
                </p>
              ) : null}
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
              className="shrink-0 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/dashboard/profilo">Modifica profilo</Link>
            </Button>
          ) : null}
        </header>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Valutazione',
              value:
                profile.ratingAvg != null
                  ? profile.ratingAvg.toFixed(1)
                  : '—',
              hint:
                profile.ratingCount > 0
                  ? `${profile.ratingCount} recensioni`
                  : 'Nessuna ancora',
              icon: <Star className="h-3.5 w-3.5 text-amber-400" />,
            },
            {
              label: 'Organizza',
              value: String(profile.tripsOrganized),
              hint: 'viaggi creati',
              icon: <Compass className="h-3.5 w-3.5 text-teal-300" />,
            },
            {
              label: 'Partecipa',
              value: String(profile.tripsJoined),
              hint: 'crew join',
              icon: <Palmtree className="h-3.5 w-3.5 text-accent" />,
            },
            {
              label: 'Trust',
              value: profile.phoneVerified ? 'OK' : '—',
              hint: profile.phoneVerified ? 'ID verificato' : 'Da verificare',
              icon: <Sparkles className="h-3.5 w-3.5 text-sky-300" />,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 backdrop-blur-md"
            >
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/45">
                {stat.icon}
                {stat.label}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-white">
                {stat.value}
              </p>
              <p className="text-[11px] text-white/40">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-12">
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Diario
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Post e foto dal profilo
              </p>
            </div>
            {isOwn ? (
              <CreatePostComposer
                compact
                tone="onDark"
                placeholder="Condividi un momento dal viaggio…"
              />
            ) : null}
            <PostFeed
              posts={posts}
              currentUserId={viewerId}
              tone="onDark"
              showSponsors={false}
              emptyMessage={
                isOwn
                  ? 'Non hai ancora pubblicato nulla. Scrivi il primo post.'
                  : 'Nessun post pubblico ancora.'
              }
            />
          </section>

          <TripSection
            title="Organizza"
            subtitle="Viaggi aperti creati da questa persona"
            icon={<Compass className="h-5 w-5 text-teal-300" />}
            trips={organizedTrips}
            empty="Nessun viaggio creato in programma."
          />

          <TripSection
            title="Partecipa"
            subtitle="Crew a cui si è unita"
            icon={<Palmtree className="h-5 w-5 text-accent" />}
            trips={joinedTrips}
            empty="Nessuna partecipazione pubblica in programma."
          />

          {/* Reviews */}
          <section className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Recensioni
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Feedback da chi ha viaggiato insieme
              </p>
              {profile.ratingAvg != null ? (
                <div className="mt-3 flex items-center gap-2">
                  <Stars value={profile.ratingAvg} />
                  <span className="text-sm text-white/70">
                    {profile.ratingAvg.toFixed(1)} · {profile.ratingCount}{' '}
                    {profile.ratingCount === 1 ? 'recensione' : 'recensioni'}
                  </span>
                </div>
              ) : null}
            </div>

            {canReview ? (
              <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-5 backdrop-blur-md">
                <LeaveReviewForm
                  revieweeId={profile.id}
                  revieweeName={profile.firstName || displayName}
                />
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/45">
                Ancora nessuna recensione.
              </p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((review, i) => {
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
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.07]"
                      style={{
                        animationDelay: `${i * 40}ms`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {href ? (
                          <Link href={href} className="shrink-0">
                            <Avatar className="h-10 w-10 border border-white/15">
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
                          <Avatar className="h-10 w-10 border border-white/15">
                            <AvatarImage src={review.reviewer.image ?? ''} alt="" />
                            <AvatarFallback className="text-xs">?</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {href ? (
                              <Link
                                href={href}
                                className="text-sm font-medium text-white hover:underline"
                              >
                                {name}
                              </Link>
                            ) : (
                              <span className="text-sm font-medium text-white">{name}</span>
                            )}
                            <Stars value={review.rating} size="sm" />
                          </div>
                          {review.tripTitle ? (
                            <p className="mt-0.5 text-[11px] text-white/40">
                              su {review.tripTitle}
                            </p>
                          ) : null}
                          <p className="mt-2 text-sm leading-relaxed text-white/75">
                            {review.body}
                          </p>
                          <p className="mt-2 text-[11px] text-white/35">
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
