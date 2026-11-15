import { auth } from '@/auth';
import { Navbar } from '@/components/layout/Navbar';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { TripGroupsChatDock } from '@/components/chat/TripGroupsChatDock';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const loggedIn = Boolean(session?.user?.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col pt-[var(--nl-nav-height)] pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <MobileTabBar isLoggedIn={loggedIn} />
      {loggedIn && session?.user?.id ? (
        <TripGroupsChatDock currentUserId={session.user.id} />
      ) : null}
    </div>
  );
}
