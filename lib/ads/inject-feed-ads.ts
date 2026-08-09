import type { SponsoredCreative } from '@/lib/ads/types';
import type { FeedPost } from '@/lib/data/posts';
import {
  BACHECA_AD_EVERY,
  BACHECA_AD_FIRST_AFTER,
  BACHECA_SPONSORS,
} from '@/lib/ads/bacheca-sponsors';

export type FeedItem =
  | { kind: 'post'; post: FeedPost }
  | { kind: 'ad'; ad: SponsoredCreative };

type InjectOptions = {
  ads?: SponsoredCreative[];
  firstAfter?: number;
  every?: number;
};

/**
 * Inserisce card sponsorizzate dopo firstAfter, poi ogni every post.
 * Es. firstAfter=3, every=7 → dopo il 3°, 10°, 17° post.
 */
export function injectFeedAds(
  posts: FeedPost[],
  options: InjectOptions = {}
): FeedItem[] {
  const ads = options.ads ?? BACHECA_SPONSORS;
  const firstAfter = options.firstAfter ?? BACHECA_AD_FIRST_AFTER;
  const every = options.every ?? BACHECA_AD_EVERY;

  if (!posts.length || !ads.length) {
    return posts.map((post) => ({ kind: 'post' as const, post }));
  }

  const items: FeedItem[] = [];
  let adIndex = 0;

  posts.forEach((post, i) => {
    items.push({ kind: 'post', post });
    const n = i + 1;
    if (n >= firstAfter && (n - firstAfter) % every === 0) {
      items.push({ kind: 'ad', ad: ads[adIndex % ads.length]! });
      adIndex += 1;
    }
  });

  return items;
}
