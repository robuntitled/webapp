import 'server-only';

import { getTravelpayoutsApiToken } from '@/lib/travelpayouts/data-api';

const LINKS_API_URL = 'https://api.travelpayouts.com/links/v1/create';

type LinkCreateEntry = {
  url: string;
  sub_id?: string;
  code?: string;
  message?: string;
  partner_url?: string;
};

type LinkCreateResponse = {
  code?: string;
  status?: number;
  result?: {
    links?: LinkCreateEntry[];
  };
  error?: string;
};

export function getTravelpayoutsTrsId(): string | null {
  return process.env.TRAVELPAYOUTS_TRS_ID?.trim() || null;
}

export function canUsePartnerLinksApi(): boolean {
  return Boolean(
    getTravelpayoutsApiToken() &&
      getTravelpayoutsTrsId() &&
      process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim()
  );
}

function mapPartnerLinkError(message: string | undefined): string {
  if (!message) return 'Link affiliate non generato';
  if (message.includes('not subscribed')) {
    return 'Project non iscritto al programma — in Travelpayouts: Tools → Projects → connetti Aviasales e Booking.com al tuo Project.';
  }
  if (message.includes('incorrect marker')) {
    return 'Partner ID (marker) non valido — verifica NEXT_PUBLIC_TRAVELPAYOUTS_MARKER su Vercel.';
  }
  if (message.includes("can't create partner link")) {
    return 'URL non valido per il programma affiliate — verifica iscrizione al brand.';
  }
  return message;
}

/**
 * Genera link affiliate ufficiale via Links API (richiede token + TRS + marker).
 * @see https://support.travelpayouts.com/hc/en-us/articles/25289759198226
 */
export async function createPartnerAffiliateLink(
  directUrl: string,
  subId?: string
): Promise<{ url: string | null; error: string | null }> {
  const token = getTravelpayoutsApiToken();
  const trs = getTravelpayoutsTrsId();
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();

  if (!token || !trs || !marker) {
    return { url: null, error: null };
  }

  const markerNum = Number(marker);
  const trsNum = Number(trs);
  if (!Number.isFinite(markerNum) || !Number.isFinite(trsNum)) {
    return { url: null, error: 'Marker o TRS ID non numerici' };
  }

  try {
    const response = await fetch(LINKS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token,
      },
      body: JSON.stringify({
        trs: trsNum,
        marker: markerNum,
        shorten: true,
        links: [{ url: directUrl, ...(subId ? { sub_id: subId } : {}) }],
      }),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { url: null, error: 'API token Travelpayouts non valido (401)' };
      }
      return { url: null, error: `Links API errore ${response.status}` };
    }

    const payload = (await response.json()) as LinkCreateResponse;
    const entry = payload.result?.links?.[0];

    if (entry?.code === 'success' && entry.partner_url) {
      return { url: entry.partner_url, error: null };
    }

    return {
      url: null,
      error: mapPartnerLinkError(entry?.message ?? payload.error),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore rete Links API';
    return { url: null, error: message };
  }
}