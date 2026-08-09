import { describe, expect, it } from 'vitest';
import { injectFeedAds } from '@/lib/ads/inject-feed-ads';
import type { SponsoredCreative } from '@/lib/ads/types';
import type { FeedPost } from '@/lib/data/posts';

function fakePost(id: string): FeedPost {
  return {
    id,
    body: '',
    imageUrl: null,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    likedByMe: false,
    author: {
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      image: null,
    },
  };
}

const ads: SponsoredCreative[] = [
  {
    id: 'a1',
    advertiser: 'A',
    headline: 'H1',
    body: 'B1',
    cta: 'Go',
    href: '/a',
    imageUrl: '/x.jpg',
  },
  {
    id: 'a2',
    advertiser: 'B',
    headline: 'H2',
    body: 'B2',
    cta: 'Go',
    href: '/b',
    imageUrl: '/y.jpg',
  },
];

describe('injectFeedAds', () => {
  it('non inserisce ads se ci sono meno di firstAfter post', () => {
    const items = injectFeedAds([fakePost('1'), fakePost('2')], {
      ads,
      firstAfter: 3,
      every: 7,
    });
    expect(items.every((i) => i.kind === 'post')).toBe(true);
    expect(items).toHaveLength(2);
  });

  it('inserisce il primo ad dopo il 3° post, poi ogni 7', () => {
    const posts = Array.from({ length: 17 }, (_, i) => fakePost(String(i + 1)));
    const items = injectFeedAds(posts, { ads, firstAfter: 3, every: 7 });
    const adPositions = items
      .map((item, idx) => (item.kind === 'ad' ? idx : -1))
      .filter((idx) => idx >= 0);

    // post0,1,2, ad, post3... → ad at index 3
    // after 10th post → index shifts by previous ads
    expect(adPositions).toHaveLength(3);
    expect(items[3]?.kind).toBe('ad');
    if (items[3]?.kind === 'ad') expect(items[3].ad.id).toBe('a1');
    expect(items[11]?.kind).toBe('ad');
    if (items[11]?.kind === 'ad') expect(items[11].ad.id).toBe('a2');
    expect(items[19]?.kind).toBe('ad');
    if (items[19]?.kind === 'ad') expect(items[19].ad.id).toBe('a1');
  });
});
