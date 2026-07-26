import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { redirect } from 'next/navigation';

export default async function PrenotaHotelPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/hotel');
  }

  return (
    <PrenotaPageShell
      title="Hotel"
      subtitle="Cerca hotel per città, paese e date. Compila i campi e premi Cerca."
    >
      <LiteApiHotelSearch defaultAdults={1} cacheKey="hotels" />
    </PrenotaPageShell>
  );
}
