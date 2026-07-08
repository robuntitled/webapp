import { Navbar } from "../../components/layout/Navbar"; // <-- PERCORSO RELATIVO CORRETTO

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navbar />
      {/* Aggiungiamo il padding qui, per spingere in basso solo il contenuto delle pagine interne */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}