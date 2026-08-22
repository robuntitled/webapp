import { redirect } from 'next/navigation';

/** T11: il composer pubblico è spento. I viaggi nascono dai template. */
export default function CreateTripRedirectPage() {
  redirect('/destinazioni');
}
