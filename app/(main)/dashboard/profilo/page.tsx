import { createClient } from '../../../../lib/supabase-server';
import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm'; // Importiamo il nostro nuovo componente form

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }
  
  const supabase = createClient();
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error("Errore recupero profilo:", error);
  }

  return (
    <div className="container mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Il Tuo Profilo</h1>
        {/* Passiamo i dati del profilo al form */}
        <ProfileForm userProfile={userProfile} />
    </div>
  );
}