import { redirect } from 'next/navigation';

/** Hub voli globale rimosso — usa la scheda del viaggio. */
export default function PrenotaVoliRedirect() {
  redirect('/dashboard');
}
