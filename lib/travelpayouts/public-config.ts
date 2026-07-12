/** Config Travelpayouts leggibile dal client (solo NEXT_PUBLIC_*). */

export function getPublicTravelWidgetId(): string | null {
  return process.env.NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID?.trim() || null;
}

export function hasEmbeddedTravelWidget(): boolean {
  return Boolean(getPublicTravelWidgetId());
}