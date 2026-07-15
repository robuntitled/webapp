'use client';

import { ItineraryColumn } from '@/components/composer/plan-v2/ItineraryColumn';
import { MapColumn } from '@/components/composer/plan-v2/MapColumn';
import type { DayTrackerSelection } from '@/components/composer/plan-v2/DayTracker';
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
  onPinClick: (pin: MapPin) => void;
  onMapClick: (lat: number, lng: number) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ComposerWorkspace(props: ComposerWorkspaceProps) {
  const {
    draft,
    selection,
    activeDay,
    activeDayIndex,
    pins,
    mapMode,
    highlightedPinId,
    hasNextDay,
    canReview,
    onSelect,
    onAddDay,
    onRemoveDay,
    onNextDay,
    onToggleFullTrip,
    onUpdateDayTitle,
    onUpdateDayNotes,
    onAddActivity,
    onEditBlock,
    onRemoveBlock,
    onHoverBlock,
    onPinClick,
    onMapClick,
    onBack,
    onReview,
  } = props;

  return (
    <div className="plan-v2-workspace flex h-full min-h-0 flex-col overflow-hidden lg:grid lg:grid-cols-[7fr_3fr]">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ItineraryColumn
          draft={draft}
          selection={selection}
          activeDay={activeDay}
          highlightedPinId={highlightedPinId}
          mapMode={mapMode}
          hasNextDay={hasNextDay}
          onSelect={onSelect}
          onAddDay={onAddDay}
          onRemoveDay={onRemoveDay}
          onNextDay={onNextDay}
          onToggleFullTrip={onToggleFullTrip}
          onUpdateDayTitle={onUpdateDayTitle}
          onUpdateDayNotes={onUpdateDayNotes}
          onAddActivity={onAddActivity}
          onEditBlock={onEditBlock}
          onRemoveBlock={onRemoveBlock}
          onHoverBlock={onHoverBlock}
          onBack={onBack}
          onReview={onReview}
          canReview={canReview}
        />
      </div>
      <div className="h-[38vh] min-h-[240px] shrink-0 overflow-hidden border-t border-slate-200 lg:h-auto lg:min-h-0 lg:border-t-0">
        <MapColumn
          draft={draft}
          pins={pins}
          mapMode={mapMode}
          activeDayIndex={activeDayIndex}
          highlightedPinId={highlightedPinId}
          onPinClick={onPinClick}
          onMapClick={onMapClick}
        />
      </div>
    </div>
  );
}
