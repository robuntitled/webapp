import { redirect } from 'next/navigation';

/** Partenze vive come toggle in /destinazioni. Join resta su /partenze/[id]. */
export default function PartenzeIndexRedirect() {
  redirect('/destinazioni?mode=group');
}
