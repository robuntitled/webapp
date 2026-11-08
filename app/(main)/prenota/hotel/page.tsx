import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';

export default function PrenotaHotelPage() {
  return (
    <PrenotaPageShell
      title="Hotel"
      subtitle="Cerca e confronta senza account. Accedi solo quando salvi il viaggio o prenoti."
      badge="Prenotabile"
    >
      <LiteApiHotelSearch defaultAdults={1} cacheKey="hotels" />
    </PrenotaPageShell>
  );
}
