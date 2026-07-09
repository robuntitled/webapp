import Link from 'next/link';
import { TripForm } from '@/components/trips/TripForm';
import { createTrip } from '@/actions/trips';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Radar, Users } from 'lucide-react';

const STEPS = [
  {
    icon: Users,
    title: 'Solo o con amici',
    text: 'Pianifica da solo o apri subito al gruppo — gli altri entrano in modalità relax.',
  },
  {
    icon: Radar,
    title: 'Radar prezzi',
    text: 'Monitora voli e hotel con Travelpayouts, poi prenota con un click.',
  },
  {
    icon: MessageCircle,
    title: 'Addio WhatsApp + Excel',
    text: 'Invita con un link: chi è svogliato vede tutto senza pianificare nulla.',
  },
] as const;

export default function CreateTripPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(2, 5)]}
        overlay="gradient"
      />

      <div className="relative z-0 container mx-auto px-4 py-10 pb-24 max-w-4xl">
        <Button
          asChild
          variant="ghost"
          className="mb-6 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
        >
          <Link href="/dashboard/miei-viaggi">
            <ArrowLeft className="mr-2 h-4 w-4" />
            I miei viaggi
          </Link>
        </Button>

        <div className="text-center mb-10">
          <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
            Organizza, non impazzire
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-white leading-tight">
            Crea il viaggio — noi gestiamo il caos
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
            Sostituisci il gruppo WhatsApp e il foglio Excel con un unico posto: tu guidi,
            gli amici si uniscono e guardano.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4 text-white"
            >
              <step.icon className="h-5 w-5 text-accent mb-2" />
              <p className="font-medium text-sm">{step.title}</p>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-3xl p-6 md:p-10">
          <TripForm action={createTrip} submitLabel="Lancia il viaggio 🚀" />
        </div>
      </div>
    </div>
  );
}