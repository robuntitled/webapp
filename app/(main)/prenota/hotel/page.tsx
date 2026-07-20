import { redirect } from 'next/navigation';

/** Hub hotel globale rimosso — la scheda viaggio è il contesto unico. */
export default function PrenotaHotelRedirect() {
  redirect('/dashboard');
}
