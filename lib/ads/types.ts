export type SponsoredCreative = {
  id: string;
  /** Nome brand / inserzionista mostrato in card */
  advertiser: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  imageUrl: string;
  /** Iniziali o lettera avatar */
  avatarInitial?: string;
};
