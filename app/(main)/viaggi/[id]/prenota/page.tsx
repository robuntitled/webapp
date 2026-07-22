import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy hub prenotazione — redirect alla scheda viaggio (LiteAPI nel composer). */
export default async function TripPrenotaRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/viaggi/${id}`);
}
