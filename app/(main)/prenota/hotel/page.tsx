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
      subtitle="Notti giuste, prezzo vero. Confronta e prenota."
      badge="Prenotabile"
    >
      <LiteApiHotelSearch defaultAdults={1} cacheKey="hotels" />
    </PrenotaPageShell>
  );
}
