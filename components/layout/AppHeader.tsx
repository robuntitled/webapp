'use client';

export function AppHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="nl-app-header fixed inset-x-0 top-0 z-50">
      {children}
    </header>
  );
}
