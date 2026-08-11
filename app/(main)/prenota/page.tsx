import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { ROUTES } from '@/lib/nav/routes';
import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';
import { Plane, Hotel, Car, Bus, Compass, Ticket } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SERVICES = [
  { href: ROUTES.prenotaPaths.voli, label: 'Voli', icon: Plane },
  { href: ROUTES.prenotaPaths.hotel, label: 'Hotel', icon: Hotel },
  { href: ROUTES.prenotaPaths.auto, label: 'Noleggio auto', icon: Car },
  { href: ROUTES.prenotaPaths.bus, label: 'Bus', icon: Bus },
  { href: ROUTES.prenotaPaths.treni, label: 'Treni', icon: Bus },
  { href: ROUTES.prenotaPaths.taxi, label: 'Taxi', icon: Car },
  { href: ROUTES.prenotaPaths.attrazioni, label: 'Attrazioni', icon: Compass },
  { href: ROUTES.prenotaPaths.attivita, label: 'Attività', icon: Ticket },
] as const;

export default async function PrenotaHubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`${ROUTES.home}?callbackUrl=${encodeURIComponent(ROUTES.prenota)}`);
  }

  const userId = session.user.id;
  const [created, joined] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
  ]);

  const byId = new Map<string, { id: string; title: string; destination: string | null }>();
  for (const t of [...created, ...joined]) {
    if (!byId.has(t.id)) {
      byId.set(t.id, {
        id: t.id,
        title: t.title,
        destination: t.destination ?? null,
      });
    }
  }
  const trips = Array.from(byId.values());

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[4], BRAND_IMAGES.heroes.slideshow[2]]}
        overlay="gradient"
      />
      <div className="relative z-0 container mx-auto px-4 py-10 pb-24 max-w-3xl">
        <p className="text-accent font-medium text-sm uppercase tracking-widest mb-2">
          Prenota
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-white">
          Per quale tuo viaggio?
        </h1>
        <p className="mt-3 text-white/70 max-w-xl">
          Di default prenoti nel contesto di un trip (date e destinazione collegate). Se ti serve
          solo un volo o un hotel, usa la ricerca libera.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
            I tuoi viaggi
          </h2>
          {trips.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 text-white/80">
              <p>Non hai ancora viaggi. Creane uno o unisciti a un trip, poi torna qui.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={ROUTES.scopri}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900"
                >
                  Scopri viaggi
                </Link>
                <Link
                  href={`${ROUTES.organizza}?new=1`}
                  className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white"
                >
                  Organizza
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {trips.map((trip) => (
                <li key={trip.id}>
                  <Link
                    href={`${ROUTES.viaggi.detail(trip.id)}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md transition hover:bg-white/15"
                  >
                    <span>
                      <span className="font-medium block">{trip.title}</span>
                      {trip.destination ? (
                        <span className="text-sm text-white/55">{trip.destination}</span>
                      ) : null}
                    </span>
                    <span className="text-sm text-accent shrink-0">Apri trip →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
            Cerca senza viaggio
          </h2>
          <p className="text-sm text-white/55 mb-4">
            Uscita esplicita: prenotazione libera, senza legare a un trip.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SERVICES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-4 text-center text-sm text-white/85 hover:border-white/30 hover:bg-white/10 transition"
              >
                <Icon className="h-5 w-5 opacity-80" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
