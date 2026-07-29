export type ActivityProvider = 'viator';

export type ActivityOffer = {
  id: string;
  provider: ActivityProvider;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  durationMinutes?: number | null;
  lat?: number | null;
  lng?: number | null;
  /** Deep-link affiliate: checkout sul sito partner */
  bookingUrl: string;
};

export type ActivitySearchResult = {
  results: ActivityOffer[];
  destinationName?: string | null;
  providers: {
    viator: 'ok' | 'skipped' | 'error';
  };
  warnings: string[];
};
