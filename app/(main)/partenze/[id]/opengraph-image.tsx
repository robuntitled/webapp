import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatEditionDateRange } from '@/lib/itineraries/dates';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ id: string }> };

export default async function PartenzaOpenGraphImage({ params }: Props) {
  const { id } = await params;
  const edition = id.startsWith('seed-') ? null : await getEdition(id);
  const template = edition ? findItineraryTemplate(edition.template_id) : null;
  const destination = template?.destination_name ?? 'Partenza di gruppo';
  const dateFrom = edition ? String(edition.date_from).slice(0, 10) : '';
  const dateTo = edition ? String(edition.date_to).slice(0, 10) : '';
  const range =
    dateFrom && dateTo ? formatEditionDateRange(dateFrom, dateTo) : '';

  let logoDataUrl: string | null = null;
  try {
    const logo = await readFile(
      join(process.cwd(), 'public/assets/logoNoivia-white.svg')
    );
    logoDataUrl = `data:image/svg+xml;base64,${logo.toString('base64')}`;
  } catch {
    logoDataUrl = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#232A6B',
          color: '#FFFFFF',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUrl} alt="" width={72} height={72} />
          ) : null}
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            PARTENZA DI GRUPPO
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
            {destination}
          </div>
          {range ? (
            <div style={{ fontSize: 28, opacity: 0.92 }}>{range}</div>
          ) : null}
        </div>
      </div>
    ),
    { ...size }
  );
}
