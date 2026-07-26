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
      subtitle="Cerca hotel per città. Prova Roma o altre destinazioni con date tra 2–4 settimane."
    >
      <LiteApiHotelSearch defaultCity="Rome" defaultCountry="IT" defaultAdults={1} />
    </PrenotaPageShell>
  );
}
