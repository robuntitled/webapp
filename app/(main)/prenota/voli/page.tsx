import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaFlightsClient } from '@/components/travel/PrenotaFlightsClient';

export default function PrenotaVoliPage() {
  return (
    <PrenotaPageShell
      title="Voli"
      subtitle="Cerca e confronta senza account. Accedi solo quando salvi il viaggio o prenoti."
      badge="Prenotabile"
    >
      <PrenotaFlightsClient />
    </PrenotaPageShell>
  );
}
