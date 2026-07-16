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
import { TravelpayoutsFlightWidget } from '@/components/travel/TravelpayoutsFlightWidget';
import { primaryOriginIata } from '@/lib/composer/origins';
import { buildFlightSearchCode } from '@/lib/travelpayouts/flight-search';
import { buildTripHotelSearchUrl } from '@/lib/travelpayouts/flight-search';
import { getPublicTravelWidgetId } from '@/lib/travelpayouts/public-config';
import type { ComposerBlockType, ComposerDraft } from '@/types/composer';
import {
  Bus,
  Car,
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
};

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
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [travelerArrivalTime, setTravelerArrivalTime] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [price, setPrice] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('flight');

  const originIata = primaryOriginIata(draft);
  const destLabel = draft.destinationMeta?.label ?? draft.destination;
  const wlId = getPublicTravelWidgetId();

  const flightSearch = useMemo(() => {
    if (mode !== 'transport' || transportMode !== 'flight') return null;
    return buildFlightSearchCode({
      destination: draft.destination,
      startDate: draft.startDate,
      endDate: draft.endDate,
      originIata,
      adults: draft.planningMode === 'group' ? Math.min(draft.maxParticipants, 9) : 1,
    });
  }, [mode, transportMode, draft, originIata]);

  const hotelSearchUrl = useMemo(() => {
    if (mode !== 'hotel') return null;
    return buildTripHotelSearchUrl(undefined, {
      destination: draft.destination,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
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
    setCheckInTime('15:00');
    setCheckOutTime('11:00');
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
        title: label.trim() || `Hotel — ${destLabel}`,
        place: hotelPlace.trim() || destLabel,
        lat: hotelCoords?.lat,
        lng: hotelCoords?.lng,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
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
                    ? 'Cerca l\'hotel e salva i dettagli nel piano.'
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
                  <label className="text-xs font-medium text-white/60">Check-in</label>
                  <Input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Check-out</label>
                  <Input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">
                  Orario arrivo effettivo del viaggiatore
                </label>
                <Input
                  type="time"
                  value={travelerArrivalTime}
                  onChange={(e) => setTravelerArrivalTime(e.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
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

          {mode === 'transport' && transportMode === 'flight' && wlId && flightSearch && (
            <div className="composer-tpwl-shell rounded-2xl overflow-hidden bg-white p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">
                Cerca voli — risultati qui sotto
              </p>
              <TravelpayoutsFlightWidget
                key={`flight-${flightSearch}`}
                wlId={wlId}
                resultsPath="/dashboard/crea"
                flightSearch={flightSearch}
                showSearch
                showResults
              />
            </div>
          )}

          {mode === 'hotel' && hotelSearchUrl && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/50">
              Suggerimento: usa la ricerca sopra per trovare l&apos;hotel, poi salva qui.
              {hotelSearchUrl && (
                <>
                  {' '}
                  <a
                    href={hotelSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="text-accent hover:underline"
                  >
                    Apri Booking.com
                  </a>{' '}
                  in una nuova scheda se serve confrontare prezzi.
                </>
              )}
            </p>
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