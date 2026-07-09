import Link from 'next/link';

export function LegalDocument({
  title,
  lastUpdated,
  notice,
  children,
}: {
  title: string;
  lastUpdated: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Torna alla home
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {lastUpdated}</p>
      </div>
      {notice}
      <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}