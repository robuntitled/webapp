import { redirect } from 'next/navigation';

/** Legacy: Partenze → Gruppi. */
export default function PartenzeIndexPage() {
  redirect('/gruppi');
}
