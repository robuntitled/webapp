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
import { primaryOriginIata } from '@/lib/composer/origins';
import type { ComposerBlockType, ComposerDraft } from '@/types/composer';
import {
  Bus,
  Car,
  ExternalLink,
  Hotel,
  Plane,
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

/** Link esterni semplici — niente widget embed (rompeva il modal). */
function buildSafeFlightLink(draft: ComposerDraft): string | null {
  const dest = draft.destinationMeta?.label ?? draft.destination;
  if (!dest?.trim()) return null;
  const origin = primaryOriginIata(draft) || 'ROM';
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();
  const params = new URLSearchParams({
    origin_iata: origin,
    destination_name: dest.trim(),
  });
  if (draft.startDate) params.set('depart_date', draft.startDate);
  if (draft.endDate) params.set('return_date', draft.endDate);
  if (marker) params.set('marker', marker);
  return `https://www.aviasales.com/search?${params.toString()}`;
}

function buildSafeHotelLink(draft: ComposerDraft): string | null {
  const dest = draft.destinationMeta?.label ?? draft.destination;
  if (!dest?.trim()) return null;
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();
  const params = new URLSearchParams({ ss: dest.trim() });
  if (draft.startDate) params.set('checkin', draft.startDate);
  if (draft.endDate) params.set('checkout', draft.endDate);
  if (marker) params.set('aid', marker);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

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

  const externalLink = useMemo(() => {
    try {
      return mode === 'hotel' ? buildSafeHotelLink(draft) : buildSafeFlightLink(draft);
    } catch {
      return null;
    }
  }, [mode, draft]);

  const selectedMode = TRANSPORT_MODES.find((m) => m.id === transportMode)!;
  const showPublicFields = PUBLIC_MODES.includes(transportMode);

  const reset = () => {
    setLabel('');
    setDeparturePoint('');
    setDepartureCoords(undefined);
    setHotelPlace('');
    setHotelCoords(undefined);
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
                <label className="text-xs font-medium text-white/60">Cerca hotel (indirizzo/zona)</label>
                <PlaceSearchInput
                  value={hotelPlace}
                  onChange={(place, coords) => {
                    setHotelPlace(place);
                    setHotelCoords(coords);
                  }}
                  placeholder="Es. Hotel vicino al centro"
                  className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white"
                />
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
          </div>

          {externalLink && (mode === 'hotel' || transportMode === 'flight') && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-accent/40 hover:bg-white/[0.08] hover:text-white"
            >
              <ExternalLink className="h-4 w-4 text-accent" />
              {mode === 'hotel'
                ? 'Apri ricerca hotel su Booking.com'
                : 'Apri ricerca voli su Aviasales'}
            </a>
          )}
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
