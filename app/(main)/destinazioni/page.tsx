import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<{ vista?: string; dest?: string; modalita?: string; slug?: string }>;
};

/** Legacy: Destinazioni → Organizza (o Gruppi se vista=partenze). */
export default async function DestinazioniPage({ searchParams }: PageProps) {
  const { vista, slug } = await searchParams;
  if (vista === 'partenze' || vista === 'unisciti') {
    redirect('/gruppi');
  }
  if (slug) {
    redirect(`/organizza?slug=${encodeURIComponent(slug)}`);
  }
  redirect('/organizza');
}
