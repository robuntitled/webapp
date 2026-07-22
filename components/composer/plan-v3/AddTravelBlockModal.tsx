'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaceSearchInput } from '@/components/composer/plan/PlaceSearchInput';
import { QuarterHourTimeSelect } from '@/components/composer/plan-v3/QuarterHourTimeSelect';
import { getDraftDestinations } from '@/lib/composer/draft-destinations';
import type { ComposerBlockType, ComposerDraft } from '@/types/composer';
import {
  Bus,
  Car,
  Hotel,
  Loader2,
  Plane,
  Plus,
  Search,
  Ship,
  Train,
  X,
} from 'lucide-react';

export type TransportMode = 'flight' | 'bus' | 'train' | 'taxi' | 'car' | 'ferry';

export type TravelBlockPayload = {
  type: ComposerBlockType;
  title: string;
  place?: string;
  pickupAddress?: string;
  departureTime?: string;
  arrivalTime?: string;
  transportMode?: TransportMode;
  bookingReference?: string;
  price?: number | null;
  lat?: number;
  lng?: number;
  checkInTime?: string;
  checkOutTime?: string;
  travelerArrivalTime?: string;
  nights?: number;
  checkInDate?: string;
  checkOutDate?: string;
  placeId?: string;
  photoUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
};

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatItDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

const TRANSPORT_MODES: {
  id: TransportMode;
  label: string;
  icon: typeof Plane;
  popular?: boolean;
  blockType: ComposerBlockType;
}[] = [
  { id: 'flight', label: 'Volo', icon: Plane, popular: true, blockType: 'flight' },
  { id: 'train', label: 'Treno', icon: Train, popular: true, blockType: 'transport' },
  { id: 'bus', label: 'Bus', icon: Bus, popular: true, blockType: 'transport' },
  { id: 'car', label: 'Auto', icon: Car, popular: true, blockType: 'transport' },
  { id: 'taxi', label: 'Taxi', icon: Car, blockType: 'transport' },
  { id: 'ferry', label: 'Traghetto', icon: Ship, blockType: 'transport' },
];

const PUBLIC_MODES: TransportMode[] = ['flight', 'bus', 'train', 'ferry'];

type AddTravelBlockModalProps = {
  open: boolean;
  mode: 'transport' | 'hotel';
  onOpenChange: (open: boolean) => void;
  draft: ComposerDraft;
  onConfirm: (payload: TravelBlockPayload) => void;
};

export function AddTravelBlockModal({
  open,
  mode,
  onOpenChange,
  draft,
  onConfirm,
}: AddTravelBlockModalProps) {
  const [label, setLabel] = useState('');
  const [departurePoint, setDeparturePoint] = useState('');
  const [departureCoords, setDepartureCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [hotelPlace, setHotelPlace] = useState('');
  const [hotelCoords, setHotelCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [hotelPlaceId, setHotelPlaceId] = useState<string | undefined>();
  const [hotelPhotoUrl, setHotelPhotoUrl] = useState<string | null>(null);
  const [hotelRating, setHotelRating] = useState<number | null>(null);
  const [hotelRatingCount, setHotelRatingCount] = useState<number | null>(null);
  const [hotelQuery, setHotelQuery] = useState('');
  const [hotelResults, setHotelResults] = useState<
    { id: string; label: string; subtitle: string; lat: number; lng: number }[]
  >([]);
  const [hotelSearching, setHotelSearching] = useState(false);
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [nights, setNights] = useState(1);
  const [travelerArrivalTime, setTravelerArrivalTime] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [price, setPrice] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('flight');

  const destLabel = draft.destinationMeta?.label ?? draft.destination;

  const hotelDates = useMemo(() => {
    const checkInDate = draft.startDate || new Date().toISOString().slice(0, 10);
    const n = Math.max(1, nights || 1);
    const checkOutDate = addDaysIso(checkInDate, n);
    return { checkInDate, checkOutDate, nights: n };
  }, [draft.startDate, nights]);

  const selectedMode = TRANSPORT_MODES.find((m) => m.id === transportMode)!;
  const showPublicFields = PUBLIC_MODES.includes(transportMode);

  const reset = () => {
    setLabel('');
    setDeparturePoint('');
    setDepartureCoords(undefined);
    setHotelPlace('');
    setHotelCoords(undefined);
    setHotelPlaceId(undefined);
    setHotelPhotoUrl(null);
    setHotelRating(null);
    setHotelRatingCount(null);
    setHotelQuery('');
    setHotelResults([]);
    setDepartureTime('');
    setArrivalTime('');
    setCheckInTime('14:00');
    setCheckOutTime('11:00');
    setNights(1);
    setTravelerArrivalTime('');
    setBookingReference('');
    setPrice('');
    setTransportMode('flight');
  };

  const searchHotels = async () => {
    const q = hotelQuery.trim();
    if (q.length < 2) return;
    const bounds = getDraftDestinations(draft)
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
      .map((d) => ({
        lat: d.lat,
        lng: d.lng,
        radiusKm: 30,
        label: d.label,
      }));
    if (bounds.length === 0) return;
    setHotelSearching(true);
    try {
      const res = await fetch('/api/places/google-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, category: 'hotel', bounds }),
      });
      const data = (await res.json()) as {
        results?: {
          id: string;
          label: string;
          subtitle: string;
          lat: number;
          lng: number;
        }[];
      };
      setHotelResults(data.results ?? []);
    } catch {
      setHotelResults([]);
    } finally {
      setHotelSearching(false);
    }
  };

  const pickHotel = async (h: {
    id: string;
    label: string;
    subtitle: string;
    lat: number;
    lng: number;
  }) => {
    setHotelPlace(h.label);
    setLabel(h.label);
    setHotelCoords({ lat: h.lat, lng: h.lng });
    setHotelPlaceId(h.id);
    setHotelResults([]);
    setHotelQuery(h.label);
    // Reset media precedenti, poi dettagli foto/rating (cache Places)
    setHotelPhotoUrl(null);
    setHotelRating(null);
    setHotelRatingCount(null);
    try {
      const res = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: h.id }),
      });
      const data = (await res.json()) as {
        place?: {
          photoUrl?: string | null;
          rating?: number | null;
          ratingCount?: number | null;
        };
      };
      if (data.place) {
        setHotelPhotoUrl(data.place.photoUrl ?? null);
        setHotelRating(data.place.rating ?? null);
        setHotelRatingCount(data.place.ratingCount ?? null);
      }
    } catch {
      // ok: placeId resta, media opzionale
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;

  const handleConfirm = () => {
    if (mode === 'hotel') {
      onConfirm({
        type: 'hotel',
        title: label.trim() || hotelPlace.trim() || `Hotel — ${destLabel}`,
        place: hotelPlace.trim() || destLabel,
        lat: hotelCoords?.lat,
        lng: hotelCoords?.lng,
        checkInTime: checkInTime || '14:00',
        checkOutTime: checkOutTime || '11:00',
        nights: hotelDates.nights,
        checkInDate: hotelDates.checkInDate,
        checkOutDate: hotelDates.checkOutDate,
        travelerArrivalTime: travelerArrivalTime || undefined,
        price: parsedPrice,
        placeId: hotelPlaceId,
        photoUrl: hotelPhotoUrl,
        rating: hotelRating,
        ratingCount: hotelRatingCount,
      });
    } else {
      onConfirm({
        type: selectedMode.blockType,
        title:
          label.trim() ||
          `${selectedMode.label} — ${departurePoint.trim() || destLabel}`,
        place: destLabel,
        pickupAddress: departurePoint.trim() || undefined,
        lat: departureCoords?.lat,
        lng: departureCoords?.lng,
        departureTime: departureTime || undefined,
        arrivalTime: arrivalTime || undefined,
        transportMode,
        bookingReference: showPublicFields ? bookingReference.trim() || undefined : undefined,
        price: parsedPrice,
      });
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="composer-v3-modal flex max-h-[92dvh] w-[min(96vw,720px)] flex-col gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#0b1120] p-0"
      >
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {mode === 'hotel' ? (
                <Hotel className="h-5 w-5 text-violet-400" />
              ) : (
                <Plane className="h-5 w-5 text-sky-400" />
              )}
              <div>
                <DialogTitle className="font-display text-lg text-white">
                  {mode === 'hotel' ? 'Aggiungi hotel' : 'Aggiungi trasporto'}
                </DialogTitle>
                <DialogDescription className="text-sm text-white/50">
                  {mode === 'hotel'
                    ? 'Inserisci hotel e orari check-in / check-out.'
                    : 'Scegli il mezzo e inserisci partenza e orari.'}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {mode === 'transport' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Mezzo di trasporto</label>
              <div className="grid grid-cols-3 gap-2">
                {TRANSPORT_MODES.map((m) => {
                  const Icon = m.icon;
                  const active = transportMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTransportMode(m.id)}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs transition ${
                        active
                          ? 'border-sky-400/60 bg-sky-500/15 text-white'
                          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25'
                      }`}
                    >
                      {m.popular && (
                        <span className="absolute -top-1.5 right-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
                          Top
                        </span>
                      )}
                      <Icon className={`h-4 w-4 ${active ? 'text-sky-300' : ''}`} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">Titolo nel piano</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                mode === 'hotel'
                  ? 'Es. Hotel centro città'
                  : `Es. ${selectedMode.label} andata`
              }
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
            />
          </div>

          {mode === 'transport' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Punto di partenza</label>
                <PlaceSearchInput
                  value={departurePoint}
                  onChange={(place, coords) => {
                    setDeparturePoint(place);
                    setDepartureCoords(coords);
                  }}
                  placeholder="Es. Aeroporto Fiumicino T3"
                  className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Orario partenza</label>
                  <Input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Orario arrivo</label>
                  <Input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>
              {showPublicFields && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">
                    Booking reference / n° volo-treno-bus
                  </label>
                  <Input
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    placeholder="Es. AZ1234 o PNR"
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Cerca hotel</label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      value={hotelQuery}
                      onChange={(e) => setHotelQuery(e.target.value)}
                      placeholder="Es. Hotel vicino al centro"
                      className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void searchHotels();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    className="h-11 shrink-0 rounded-xl"
                    onClick={() => void searchHotels()}
                    disabled={hotelSearching}
                  >
                    {hotelSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Cerca'
                    )}
                  </Button>
                </div>
                {hotelResults.length > 0 && (
                  <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-1">
                    {hotelResults.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => pickHotel(h)}
                          className="flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                        >
                          <span>
                            <span className="block font-medium">{h.label}</span>
                            {h.subtitle && (
                              <span className="block text-xs text-white/45">{h.subtitle}</span>
                            )}
                          </span>
                          <Plus className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {hotelPlace && (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                    {hotelPhotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={hotelPhotoUrl}
                        alt={hotelPlace}
                        className="h-28 w-full object-cover"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <p className="truncate text-sm font-medium text-white">{hotelPlace}</p>
                      {hotelRating != null && (
                        <span className="shrink-0 text-xs font-semibold text-amber-300">
                          ★ {hotelRating.toFixed(1)}
                          {hotelRatingCount != null ? ` (${hotelRatingCount})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">
                    Check-in (orario)
                  </label>
                  <QuarterHourTimeSelect
                    value={checkInTime}
                    onChange={setCheckInTime}
                    allowEmpty={false}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">
                    Check-out (orario)
                  </label>
                  <QuarterHourTimeSelect
                    value={checkOutTime}
                    onChange={setCheckOutTime}
                    allowEmpty={false}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">N. notti</label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={nights}
                  onChange={(e) => setNights(Math.max(1, Number(e.target.value) || 1))}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                />
                <p className="text-xs text-white/45">
                  Check-in {formatItDate(hotelDates.checkInDate)} · Check-out{' '}
                  {formatItDate(hotelDates.checkOutDate)} ({hotelDates.nights}{' '}
                  {hotelDates.nights === 1 ? 'notte' : 'notti'})
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">
                  Orario arrivo effettivo del viaggiatore
                </label>
                <QuarterHourTimeSelect
                  value={travelerArrivalTime}
                  onChange={setTravelerArrivalTime}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">Prezzo (opzionale)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Es. 120"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
            />
            {(mode === 'hotel' || transportMode === 'flight') && (
              <p className="text-[11px] text-white/40">
                Tariffe live: usa «Aggiorna tariffe LiteAPI» nel pannello del blocco dopo aver
                salvato.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <Button type="button" className="w-full rounded-full" onClick={handleConfirm}>
            Salva nel piano
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
