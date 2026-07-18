'use client';

import { useEffect, useMemo, useState } from 'react';
import { BlockEditorPanel } from '@/components/composer/BlockEditorPanel';
import { ComposerWorkspace } from '@/components/composer/plan-v3/ComposerWorkspace';
import {
  AddActivityModal,
  type AddActivityPayload,
} from '@/components/composer/plan-v3/AddActivityModal';
import {
  MapPlaceAddSheet,
  type MapPlacePreview,
} from '@/components/composer/plan-v3/MapPlaceAddSheet';
import {
  AddTravelBlockModal,
  type TravelBlockPayload,
} from '@/components/composer/plan-v3/AddTravelBlockModal';
import type { DayTrackerSelection } from '@/components/composer/plan-v3/DayTracker';
import { createEmptyBlock } from '@/lib/composer/blocks';
import {
  cascadeTimesAfterBlock,
  repackBlockTimesInOrder,
} from '@/lib/composer/day-time-schedule';
import {
  appendComposerDay,
  endDateFromDays,
  removeComposerDay,
} from '@/lib/composer/days';
import { getDraftDestinations } from '@/lib/composer/draft-destinations';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import { prefetchPlacesForComposer } from '@/lib/places/places-search-client';
import type {
  ComposerBlock,
  ComposerDay,
  ComposerDraft,
} from '@/types/composer';
import { toast } from 'sonner';

type ComposerPlanStepProps = {
  draft: ComposerDraft;
  onChangeDays: (days: ComposerDay[]) => void;
  onPatchDraft?: (patch: Partial<ComposerDraft>) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ComposerPlanStep({
  draft,
  onChangeDays,
  onPatchDraft,
  onBack,
  onReview,
}: ComposerPlanStepProps) {
  const [selection, setSelection] = useState<DayTrackerSelection>(1);
  const [editingBlock, setEditingBlock] = useState<ComposerBlock | null>(null);
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapViewMode>('day');
  const [addOpen, setAddOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<'transport' | 'hotel'>('transport');
  const [mapPlaceOpen, setMapPlaceOpen] = useState(false);
  const [mapPlaceLoading, setMapPlaceLoading] = useState(false);
  const [mapPlaceError, setMapPlaceError] = useState<string | null>(null);
  const [mapPlace, setMapPlace] = useState<MapPlacePreview | null>(null);

  const activeDayIndex = selection === 'overview' ? draft.days[0]?.dayIndex ?? 1 : selection;
  const activeDay =
    selection === 'overview'
      ? null
      : (draft.days.find((d) => d.dayIndex === selection) ?? draft.days[0] ?? null);

  const hasNextDay =
    selection !== 'overview' && draft.days.some((d) => d.dayIndex === selection + 1);
  const totalBlocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);

  // Fingerprint solo di ciò che i pin usano (blocchi/coord/destinazione).
  // Esclude note del giorno e titoli giorno → niente ricalcolo/flash mappa digitando note.
  const pinFingerprint = useMemo(() => {
    const dest = draft.destinationMeta
      ? `${draft.destinationMeta.lat},${draft.destinationMeta.lng}`
      : draft.destination;
    const daysKey = draft.days
      .map((d) => {
        const blocks = d.blocks
          .map(
            (b) =>
              `${b.id}:${b.type}:${String(b.content.lat ?? '')}:${String(b.content.lng ?? '')}:${String(b.content.title ?? '')}`
          )
          .join('|');
        return `${d.dayIndex}{${blocks}}`;
      })
      .join(';');
    return `${dest}::${daysKey}`;
  }, [draft.destination, draft.destinationMeta, draft.days]);

  const pins = useMemo(() => {
    if (mapMode === 'fullTrip' || selection === 'overview') {
      return buildPinsFromDraft(draft, { activeDayIndex });
    }
    return buildPinsFromDraft(draft, {
      activeDayIndex,
      dayFilter: activeDayIndex,
    });
    // pinFingerprint cattura i campi rilevanti di draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinFingerprint, mapMode, selection, activeDayIndex]);

  // Prefetch Attrazioni per la destinazione: aprire Aggiungi è più rapido
  useEffect(() => {
    const dests = getDraftDestinations(draft)
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
      .map((d) => ({
        lat: d.lat,
        lng: d.lng,
        radiusKm: 30,
        label: d.label,
      }));
    if (dests.length === 0) return;
    prefetchPlacesForComposer({ category: 'attraction', bounds: dests });
  }, [draft.destination, draft.destinationMeta?.lat, draft.destinationMeta?.lng]);

  const updateDay = (dayIndex: number, updater: (day: ComposerDay) => ComposerDay) => {
    onChangeDays(draft.days.map((d) => (d.dayIndex === dayIndex ? updater(d) : d)));
  };

  const commitDays = (days: ComposerDay[]) => {
    if (onPatchDraft) {
      onPatchDraft({ days, endDate: endDateFromDays(days) });
    } else {
      onChangeDays(days);
    }
  };

  const addDay = () => {
    const days = appendComposerDay(draft.days);
    commitDays(days);
    setSelection(days[days.length - 1].dayIndex);
    setMapMode('day');
    toast.success(`Giorno ${days.length} aggiunto`);
  };

  const removeDay = (dayIndex: number) => {
    if (draft.days.length <= 1) {
      toast.message('Serve almeno un giorno');
      return;
    }
    const days = removeComposerDay(draft.days, dayIndex);
    commitDays(days);
    setSelection((prev) => {
      if (prev === 'overview') return 'overview';
      return Math.min(prev, days.length);
    });
    toast.message('Giorno rimosso');
  };

  const goToNextDay = () => {
    if (selection === 'overview') return;
    if (!hasNextDay) return;
    setSelection(selection + 1);
    setHighlightedPinId(null);
    setMapMode('day');
  };

  const ensureActiveDay = (): ComposerDay | null => {
    if (activeDay) return activeDay;
    const first = draft.days[0];
    if (first) {
      setSelection(first.dayIndex);
      return first;
    }
    return null;
  };

  const addActivity = (payload: AddActivityPayload) => {
    const day = ensureActiveDay();
    if (!day) return;
    const block = createEmptyBlock(payload.type, day.blocks.length, {
      title: payload.title,
      place: payload.place,
      time: payload.time,
      endTime: payload.endTime,
      duration: payload.duration,
      lat: payload.lat,
      lng: payload.lng,
      price: payload.price ?? null,
      timeSlot: 'flex',
      placeId: payload.placeId,
      rating: payload.rating ?? null,
      ratingCount: payload.ratingCount ?? null,
      photoUrl: payload.photoUrl,
      photoName: payload.photoName,
    });
    updateDay(day.dayIndex, (d) => ({ ...d, blocks: [...d.blocks, block] }));
    setHighlightedPinId(block.id);
    setMapMode('day');
    toast.success('Attività aggiunta');
  };

  const updateBlock = (blockId: string, updater: (block: ComposerBlock) => ComposerBlock) => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === blockId ? updater(b) : b)),
    }));
    if (editingBlock?.id === blockId) {
      setEditingBlock((prev) => (prev ? updater(prev) : null));
    }
  };

  const removeBlock = (blockId: string) => {
    const day = activeDay ?? draft.days.find((d) => d.blocks.some((b) => b.id === blockId));
    if (!day) return;
    updateDay(day.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.filter((b) => b.id !== blockId),
    }));
    if (editingBlock?.id === blockId) setEditingBlock(null);
    if (highlightedPinId === blockId) setHighlightedPinId(null);
  };

  const reorderBlocks = (fromIndex: number, toIndex: number) => {
    if (!activeDay || fromIndex === toIndex) return;
    const blocks = [...activeDay.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    // Ripacchetta orari in sequenza dopo drag&drop
    const repacked = repackBlockTimesInOrder(
      blocks.map((b, i) => ({ ...b, sortOrder: i }))
    );
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: repacked,
    }));
    toast.message('Orari aggiornati in sequenza');
  };

  const cascadeDayTimes = (
    dayIndex: number,
    editedBlockId: string,
    startTime: string,
    endTime: string
  ) => {
    const day = draft.days.find((d) => d.dayIndex === dayIndex);
    if (!day) return;
    const next = cascadeTimesAfterBlock(day.blocks, editedBlockId, startTime, endTime);
    updateDay(dayIndex, (d) => ({ ...d, blocks: next }));
  };

  const addTravelBlock = (payload: TravelBlockPayload) => {
    const day = ensureActiveDay();
    if (!day) return;
    const isFlight = payload.type === 'flight';
    const block = createEmptyBlock(payload.type, day.blocks.length, {
      title: payload.title,
      place: payload.place,
      area: payload.type === 'hotel' ? payload.place : undefined,
      from: isFlight ? payload.pickupAddress : undefined,
      pickupAddress: payload.pickupAddress,
      to: payload.place,
      mode: payload.transportMode ?? (isFlight ? 'flight' : 'taxi'),
      departureTime: payload.departureTime,
      arrivalTime: payload.arrivalTime,
      time: payload.departureTime,
      checkInTime: payload.checkInTime,
      checkOutTime: payload.checkOutTime,
      travelerArrivalTime: payload.travelerArrivalTime,
      bookingReference: payload.bookingReference,
      price: payload.price ?? null,
      lat: payload.lat,
      lng: payload.lng,
      timeSlot: 'flex',
    });
    updateDay(day.dayIndex, (d) => ({ ...d, blocks: [...d.blocks, block] }));
    toast.success(payload.type === 'hotel' ? 'Hotel aggiunto' : 'Trasporto aggiunto');
  };

  const updateBlockNotes = (blockId: string, notes: string) => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        b.id === blockId ? { ...b, content: { ...b.content, notes: notes || undefined } } : b
      ),
    }));
  };

  const addAttachment = (blockId: string, label: string, url: string) => {
    if (!activeDay) return;
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              content: {
                ...b.content,
                attachments: [
                  ...(Array.isArray(b.content.attachments) ? b.content.attachments : []),
                  { id, label, url },
                ],
              },
            }
          : b
      ),
    }));
  };

  const removeAttachment = (blockId: string, id: string) => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              content: {
                ...b.content,
                attachments: (Array.isArray(b.content.attachments) ? b.content.attachments : []).filter(
                  (a: { id: string }) => a.id !== id
                ),
              },
            }
          : b
      ),
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ComposerWorkspace
        draft={draft}
        selection={selection}
        activeDay={activeDay}
        activeDayIndex={activeDayIndex}
        pins={pins}
        mapMode={mapMode}
        highlightedPinId={highlightedPinId}
        hasNextDay={hasNextDay}
        canReview={totalBlocks > 0}
        onSelect={(s) => {
          setSelection(s);
          setHighlightedPinId(null);
          if (s === 'overview') setMapMode('fullTrip');
          else setMapMode('day');
        }}
        onAddDay={addDay}
        onRemoveDay={removeDay}
        onNextDay={goToNextDay}
        onToggleFullTrip={() => setMapMode((m) => (m === 'fullTrip' ? 'day' : 'fullTrip'))}
        onUpdateDayTitle={(title) => {
          if (!activeDay) return;
          updateDay(activeDay.dayIndex, (d) => ({ ...d, title }));
        }}
        onUpdateDayNotes={(notes) => {
          if (!activeDay) return;
          updateDay(activeDay.dayIndex, (d) => ({
            ...d,
            notes: notes || undefined,
          }));
        }}
        onAddActivity={() => {
          if (selection === 'overview' && draft.days[0]) {
            setSelection(draft.days[0].dayIndex);
          }
          setAddOpen(true);
        }}
        onAddTransport={() => {
          if (selection === 'overview' && draft.days[0]) {
            setSelection(draft.days[0].dayIndex);
          }
          setTravelMode('transport');
          setTravelOpen(true);
        }}
        onAddHotel={() => {
          if (selection === 'overview' && draft.days[0]) {
            setSelection(draft.days[0].dayIndex);
          }
          setTravelMode('hotel');
          setTravelOpen(true);
        }}
        onEditBlock={setEditingBlock}
        onRemoveBlock={removeBlock}
        onHoverBlock={setHighlightedPinId}
        onReorderBlocks={reorderBlocks}
        onUpdateBlockNotes={updateBlockNotes}
        onAddAttachment={addAttachment}
        onRemoveAttachment={removeAttachment}
        onPinClick={(pin) => {
          // Solo pin già presenti nel piano — niente click a caso sulla mappa
          if (pin.blockId) {
            setSelection(pin.dayIndex);
            setMapMode('day');
            setHighlightedPinId(pin.blockId);
            const day = draft.days.find((d) => d.dayIndex === pin.dayIndex);
            const block = day?.blocks.find((b) => b.id === pin.blockId);
            if (block) setEditingBlock(block);
          }
        }}
        onPoiClick={(payload) => {
          // POI basemap Google → sheet Aggiungi con nome/rating/foto
          if (selection === 'overview' && draft.days[0]) {
            setSelection(draft.days[0].dayIndex);
          }
          setMapPlaceOpen(true);
          setMapPlaceLoading(true);
          setMapPlaceError(null);
          setMapPlace({
            placeId: payload.placeId,
            name: '…',
            lat: payload.lat,
            lng: payload.lng,
          });

          void fetch('/api/places/details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId: payload.placeId }),
          })
            .then(async (res) => {
              const data = (await res.json()) as {
                place?: {
                  placeId: string;
                  name: string;
                  address?: string;
                  lat: number | null;
                  lng: number | null;
                  rating?: number | null;
                  ratingCount?: number | null;
                  photoUrl?: string | null;
                  primaryType?: string | null;
                };
                error?: string;
              };
              if (!res.ok || !data.place) {
                throw new Error(data.error || 'Dettagli non disponibili');
              }
              setMapPlace({
                placeId: data.place.placeId,
                name: data.place.name,
                address: data.place.address,
                lat: data.place.lat ?? payload.lat,
                lng: data.place.lng ?? payload.lng,
                rating: data.place.rating,
                ratingCount: data.place.ratingCount,
                photoUrl: data.place.photoUrl,
                primaryType: data.place.primaryType,
              });
            })
            .catch((err: unknown) => {
              setMapPlaceError(
                err instanceof Error ? err.message : 'Impossibile caricare il luogo'
              );
              // Fallback: almeno nome generico + coordinate del click
              setMapPlace((prev) =>
                prev
                  ? { ...prev, name: prev.name === '…' ? 'Luogo sulla mappa' : prev.name }
                  : null
              );
            })
            .finally(() => setMapPlaceLoading(false));
        }}
        onBack={onBack}
        onReview={onReview}
      />

      <MapPlaceAddSheet
        open={mapPlaceOpen}
        place={mapPlace}
        loading={mapPlaceLoading}
        error={mapPlaceError}
        dayBlocks={activeDay?.blocks ?? draft.days[0]?.blocks ?? []}
        onOpenChange={(open) => {
          setMapPlaceOpen(open);
          if (!open) {
            setMapPlace(null);
            setMapPlaceError(null);
            setMapPlaceLoading(false);
          }
        }}
        onConfirm={(payload) => {
          addActivity(payload);
          setMapPlaceOpen(false);
          setMapPlace(null);
        }}
      />

      <AddActivityModal
        open={addOpen}
        onOpenChange={setAddOpen}
        draft={draft}
        activeDayIndex={activeDayIndex}
        onConfirm={addActivity}
      />

      <AddTravelBlockModal
        open={travelOpen}
        mode={travelMode}
        onOpenChange={setTravelOpen}
        draft={draft}
        onConfirm={addTravelBlock}
      />

      <BlockEditorPanel
        block={editingBlock}
        draft={draft}
        open={!!editingBlock}
        onOpenChange={(open) => {
          if (!open) setEditingBlock(null);
        }}
        onUpdate={updateBlock}
        onRemove={removeBlock}
        onCascadeDayTimes={cascadeDayTimes}
      />
    </div>
  );
}
