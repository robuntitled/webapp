export default function CreateTripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="composer-page-shell flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
      {children}
    </div>
  );
}
