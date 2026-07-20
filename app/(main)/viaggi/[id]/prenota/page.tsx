import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Prenota-hub Travelpayouts rimosso dalla scheda viaggio. */
export default async function TripPrenotaRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/viaggi/${id}`);
}
