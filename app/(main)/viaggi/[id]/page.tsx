import { redirect } from 'next/navigation';

/** Legacy creator trip detail → pratiche (editions). */
export default function LegacyTripRedirectPage() {
  redirect('/pratiche');
}
