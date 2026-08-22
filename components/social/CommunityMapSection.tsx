'use client';

import dynamic from 'next/dynamic';
import type { CommunityPhotoPin } from '@/lib/data/community-map';

const CommunityMap = dynamic(
  () => import('@/components/social/CommunityMap').then((m) => m.CommunityMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-[#0b1220]/70 text-sm text-white/60">
        Caricamento mappa…
      </div>
    ),
  }
);

type CommunityMapSectionProps = {
  photoPins: CommunityPhotoPin[];
};

export function CommunityMapSection({ photoPins }: CommunityMapSectionProps) {
  return <CommunityMap photoPins={photoPins} />;
}
