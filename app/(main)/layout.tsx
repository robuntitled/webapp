import { Navbar } from '@/components/layout/Navbar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Navbar />
      <main className="flex min-h-0 flex-1 flex-col pt-16">{children}</main>
    </div>
  );
}