'use client';

import dynamic from 'next/dynamic';
import type { CommunityMapPin, MyMapLocation } from '@/lib/data/community-map';

const CommunityMap = dynamic(
  () =>
    import('@/components/social/CommunityMap').then((m) => m.CommunityMap),
  {
    ssr: false,
    loading: () => (
      <div className="nl-feed-card flex h-[340px] items-center justify-center rounded-3xl text-sm text-white/55">
        Caricamento mappa…
      </div>
    ),
  }
);

type CommunityMapSectionProps = {
  pins: CommunityMapPin[];
  me: MyMapLocation | null;
  currentUserId: string;
};

export function CommunityMapSection(props: CommunityMapSectionProps) {
  return <CommunityMap {...props} />;
}
