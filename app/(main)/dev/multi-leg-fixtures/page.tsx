import { notFound } from 'next/navigation';
import { MultiLegFixturesClient } from '@/components/dev/MultiLegFixturesClient';

/** Preview/local visual fixtures for multi-leg checkout + iOS calendar QA. */
export default function MultiLegFixturesPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <MultiLegFixturesClient />;
}
