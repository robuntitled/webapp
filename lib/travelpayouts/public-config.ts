import { getTravelEmbedCredentials } from '@/lib/travelpayouts/embed-config';

/** Widget tpemd.com (search + map) — configurazione consigliata */
export function hasTravelpayoutsEmbed(): boolean {
  return Boolean(getTravelEmbedCredentials());
}

export function getPublicTravelWidgetId(): string | null {
  return process.env.NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID?.trim() || null;
}

/** Qualsiasi widget integrato (tpemd o WL legacy) */
export function hasEmbeddedTravelWidget(): boolean {
  return hasTravelpayoutsEmbed() || Boolean(getPublicTravelWidgetId());
}