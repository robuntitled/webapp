import { redirect } from 'next/navigation';

/** Legacy trip edit → pratiche. */
export default function LegacyTripEditRedirectPage() {
  redirect('/pratiche');
}
