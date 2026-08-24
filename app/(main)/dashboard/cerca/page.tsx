import { redirect } from 'next/navigation';

/** Legacy discover trips → catalogo itinerari. */
export default function DashboardCercaRedirectPage() {
  redirect('/destinazioni');
}
