export type AttractionHit = {
  id: string;
  provider: 'viator';
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  productCount: number;
  freeAttraction: boolean;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  /** Deep-link affiliate Viator (pagina attrazione + tour) */
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
