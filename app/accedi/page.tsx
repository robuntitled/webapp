import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Accedi',
  description:
    'Accedi o registrati su Flygetr: itinerari ufficiali, gruppo in formazione, prenoti voli e hotel per conto proprio.',
  robots: { index: false, follow: true },
};

export default function AccediPage() {
  return <AuthCard />;
}
