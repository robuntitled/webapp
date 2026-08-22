import { CatalogHome } from '@/components/itineraries/CatalogHome';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { listOfficialEditions } from '@/lib/data/editions';
import { publishedDestinations } from '@/lib/itineraries/catalog';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [destinations, editions] = await Promise.all([
    Promise.resolve(publishedDestinations()),
    listOfficialEditions(),
  ]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(1, 4)]}
        overlay="gradient"
        parallax
      />
      <div className="relative z-0">
        <CatalogHome destinations={destinations} editions={editions} />
      </div>
    </div>
  );
}
