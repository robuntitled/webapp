import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { fetchTripById } from '@/lib/data/trips';
import { TripForm } from '@/components/trips/TripForm';
import { updateTrip } from '@/actions/trips';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTripPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const { id } = await params;
  const trip = await fetchTripById(id, session.user.id);

  if (!trip) {
    notFound();
  }

  if (trip.creator?.id !== session.user.id) {
    redirect('/dashboard/miei-viaggi');
  }

  const boundUpdateTrip = updateTrip.bind(null, id);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-slate-950 p-8 rounded-xl shadow-lg my-10">
        <h1 className="text-3xl font-bold mb-8">Modifica Viaggio</h1>
        <TripForm action={boundUpdateTrip} submitLabel="Salva Modifiche" initialTrip={trip} />
      </div>
    </div>
  );
}