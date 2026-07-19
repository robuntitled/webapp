import { auth } from '@/auth';
import { Navbar } from '@/components/layout/Navbar';
import { TripGroupsChatDock } from '@/components/chat/TripGroupsChatDock';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col pt-16">{children}</main>
      {session?.user?.id ? <TripGroupsChatDock currentUserId={session.user.id} /> : null}
    </div>
  );
}
