export type AttractionHit = {
  id: string;
  provider: 'viator';
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  /** Legacy POI field; per prodotti singoli resta 0 */
  productCount: number;
  freeAttraction: boolean;
  priceFrom?: number | null;
  currency?: string | null;
  durationMinutes?: number | null;
  /** Es. "Colosseo · Piazza del Colosseo…" */
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Deep-link affiliate Viator (pagina prodotto) */
  bookingUrl: string;
};

export type AttractionSearchResult = {
  results: AttractionHit[];
  destinationName?: string | null;
  provider: 'ok' | 'skipped' | 'error';
  warnings: string[];
  nextStart?: number | null;
  hasMore?: boolean;
  totalCount?: number | null;
};
