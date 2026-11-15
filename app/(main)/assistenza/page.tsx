import { redirect } from 'next/navigation';

/**
 * Canonical support URL for nav/footer (`/assistenza`).
 * Content lives on `/supporto` (placeholder — no invented email).
 */
export default function AssistenzaPage() {
  redirect('/supporto');
}
