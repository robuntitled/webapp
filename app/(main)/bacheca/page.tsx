import { redirect } from 'next/navigation';

/** Alias pubblico: /bacheca → area community loggata. */
export default function BachecaAliasPage() {
  redirect('/dashboard/bacheca');
}
