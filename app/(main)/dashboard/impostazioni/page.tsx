import { createClient } from '../../../../lib/supabase-server';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import SettingsForm from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }
  
  const supabase = createClient();
  const { data: userSettings, error } = await supabase
    .from('users')
    .select('email, email_notifications') // Carichiamo solo i dati che ci servono
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error("Errore recupero impostazioni:", error);
  }

  return (
    <div className="container mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-2">Impostazioni</h1>
        <p className="text-slate-500 mb-8">Gestisci le impostazioni del tuo account e le preferenze.</p>
        <SettingsForm userSettings={userSettings} />
    </div>
  );
}