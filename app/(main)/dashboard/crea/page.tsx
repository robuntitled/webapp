import { TripForm } from '@/components/trips/TripForm';
import { createTrip } from '@/actions/trips';

export default function CreateTripPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-slate-950 p-8 rounded-xl shadow-lg my-10">
        <h1 className="text-3xl font-bold mb-8">Crea il Tuo Prossimo Viaggio</h1>
        <TripForm action={createTrip} submitLabel="Pubblica Viaggio" />
      </div>
    </div>
  );
}