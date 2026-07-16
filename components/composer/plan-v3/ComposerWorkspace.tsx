'use client';

import { ItineraryColumn } from '@/components/composer/plan-v3/ItineraryColumn';
import { MapColumn } from '@/components/composer/plan-v3/MapColumn';
import type { DayTrackerSelection } from '@/components/composer/plan-v3/DayTracker';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { ComposerBlock, ComposerDay, ComposerDraft } from '@/types/composer';

type ComposerWorkspaceProps = {
  draft: ComposerDraft;
  selection: DayTrackerSelection;
  activeDay: ComposerDay | null;
  activeDayIndex: number;
  pins: MapPin[];
  mapMode: MapViewMode;
  highlightedPinId: string | null;
  hasNextDay: boolean;
  canReview: boolean;
  onSelect: (selection: DayTrackerSelection) => void;
  onAddDay: () => void;
  onRemoveDay: (dayIndex: number) => void;
  onNextDay: () => void;
  onToggleFullTrip: () => void;
  onUpdateDayTitle: (title: string) => void;
  onUpdateDayNotes: (notes: string) => void;
  onAddActivity: () => void;
  onEditBlock: (block: ComposerBlock) => void;
  onRemoveBlock: (blockId: string) => void;
  onHoverBlock: (blockId: string | null) => void;
  onReorderBlocks: (fromIndex: number, toIndex: number) => void;
  onAddTransport: () => void;
  onAddHotel: () => void;
  onUpdateBlockNotes: (blockId: string, notes: string) => void;
  onAddAttachment: (blockId: string, label: string, url: string) => void;
  onRemoveAttachment: (blockId: string, id: string) => void;
  onPinClick: (pin: MapPin) => void;
  onMapClick: (lat: number, lng: number) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ComposerWorkspace(props: ComposerWorkspaceProps) {
  const { onPinClick, onMapClick, ...itineraryProps } = props;

  return (
    <div className="composer-v3-workspace flex h-full min-h-0 flex-col overflow-hidden lg:grid lg:grid-cols-[7fr_3fr]">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ItineraryColumn {...itineraryProps} />
      </div>
      <div className="h-[38vh] min-h-[240px] shrink-0 overflow-hidden border-t border-white/10 lg:h-auto lg:min-h-0 lg:border-t-0">
        <MapColumn
          draft={props.draft}
          pins={props.pins}
          mapMode={props.mapMode}
          activeDayIndex={props.activeDayIndex}
          highlightedPinId={props.highlightedPinId}
          onPinClick={onPinClick}
          onMapClick={onMapClick}
        />
      </div>
    </div>
  );
}
