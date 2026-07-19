import Link from 'next/link';
import Image from 'next/image';
import { Compass, MapPin, Palmtree } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VerifiedBadges } from '@/components/profile/VerifiedBadges';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { formatTripDate } from '@/lib/utils/trip';
import { getInitialsFromNames } from '@/lib/utils/user';
import type { PublicProfile, PublicProfileTrip } from '@/lib/data/public-profile';

type PublicProfileViewProps = {
  profile: PublicProfile;
  trips: PublicProfileTrip[];
  isOwn?: boolean;
};

export function PublicProfileView({ profile, trips, isOwn }: PublicProfileViewProps) {
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    `@${profile.username}`;
  const place = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="h-28 bg-gradient-to-br from-primary/25 via-accent/20 to-teal-500/15 sm:h-36" />
        <div className="relative px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md sm:h-28 sm:w-28">
                <AvatarImage src={profile.image ?? ''} alt={displayName} />
                <AvatarFallback className="text-xl">
                  {getInitialsFromNames(profile.firstName, profile.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    {displayName}
                  </h1>
                  <VerifiedBadges phoneVerified={profile.phoneVerified} />
                </div>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                {place ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {place}
                  </p>
                ) : null}
              </div>
            </div>
            {isOwn ? (
              <Button asChild variant="outline" size="sm" className="rounded-full shrink-0">
                <Link href="/dashboard/profilo">Modifica profilo</Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl border bg-muted/30 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Compass className="h-3.5 w-3.5" />
                Organizza
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {profile.tripsOrganized}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/30 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Palmtree className="h-3.5 w-3.5" />
                Partecipa
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {profile.tripsJoined}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">Viaggi organizzati</h2>
          <p className="text-sm text-muted-foreground">
            Prossimi viaggi aperti — tocca per vedere i dettagli
          </p>
        </div>

        {trips.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Nessun viaggio pubblico in programma.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/viaggi/${trip.id}`}
                  className="group flex overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative h-24 w-24 shrink-0 bg-muted sm:h-28 sm:w-28">
                    <Image
                      src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                      alt=""
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="112px"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3">
                    <p className="truncate font-medium">{trip.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{trip.destination}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTripDate(trip.startDate)} · {trip.price}€
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
