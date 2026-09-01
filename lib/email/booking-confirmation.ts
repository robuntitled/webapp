import 'server-only';

import { getAppBaseUrl } from '@/lib/auth/app-url';
import { sendTransactionalEmail } from '@/lib/email/send';
import {
  formatBookingMoney,
  formatFlightWhen,
  type ActivityBookingRecap,
  type FlightBookingRecap,
  type HotelBookingRecap,
} from '@/lib/itineraries/bookings';

type Kind = 'flight' | 'hotel' | 'activity';

function kindLabel(kind: Kind) {
  if (kind === 'flight') return 'Volo';
  if (kind === 'hotel') return 'Hotel';
  return 'Attività Viator';
}

function flightLines(recap: FlightBookingRecap): string[] {
  const o = recap.outbound;
  const lines = [
    `Andata: ${o.origin} → ${o.destination}`,
    [o.airline, o.flightNumber].filter(Boolean).join(' · '),
    formatFlightWhen(o.departureAt),
  ].filter(Boolean);
  if (recap.returnLeg) {
    const r = recap.returnLeg;
    lines.push(
      `Ritorno: ${r.origin} → ${r.destination}`,
      [r.airline, r.flightNumber].filter(Boolean).join(' · '),
      formatFlightWhen(r.departureAt)
    );
  }
  return lines;
}

function hotelLines(recap: HotelBookingRecap): string[] {
  return [
    recap.hotelName,
    [recap.city, recap.roomName].filter(Boolean).join(' · '),
    recap.checkin && recap.checkout ? `${recap.checkin} → ${recap.checkout}` : '',
  ].filter(Boolean);
}

export async function sendBookingConfirmationEmail(input: {
  to: string;
  kind: Kind;
  destinationName: string;
  practiceId: string;
  bookingRef: string | null;
  amountEur?: number | null;
  currency?: string | null;
  flight?: FlightBookingRecap | null;
  hotel?: HotelBookingRecap | null;
  activity?: ActivityBookingRecap | null;
}): Promise<void> {
  const praticaUrl = `${getAppBaseUrl()}/pratica/${input.practiceId}`;
  const title = `Conferma ${kindLabel(input.kind)} — ${input.destinationName}`;
  const ref = input.bookingRef || 'in elaborazione';
  const money = formatBookingMoney(input.amountEur, input.currency);
  const details =
    input.kind === 'flight' && input.flight
      ? flightLines(input.flight)
      : input.kind === 'hotel' && input.hotel
        ? hotelLines(input.hotel)
        : input.activity
          ? [input.activity.title]
          : [];

  const text = [
    `Prenotazione confermata: ${kindLabel(input.kind)}`,
    `Destinazione: ${input.destinationName}`,
    `Codice: ${ref}`,
    money ? `Importo: ${money}` : '',
    ...details,
    '',
    `Recap nel tuo viaggio: ${praticaUrl}`,
    '',
    'Ogni servizio è prenotato col rispettivo fornitore. Flygetr non è un tour operator.',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0b1220">
      <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7c3aed;font-weight:700">Flygetr</p>
      <h1 style="font-size:22px;margin:8px 0 16px">Prenotazione confermata</h1>
      <p><strong>${kindLabel(input.kind)}</strong> · ${input.destinationName}</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:.04em;margin:16px 0">${ref}</p>
      ${money ? `<p>Importo: <strong>${money}</strong></p>` : ''}
      ${details.map((d) => `<p style="margin:4px 0;color:#334">${d}</p>`).join('')}
      <p style="margin-top:24px">
        <a href="${praticaUrl}" style="display:inline-block;padding:12px 20px;background:#7c3aed;color:#fff;border-radius:999px;text-decoration:none;font-weight:600">Vedi il recap</a>
      </p>
      <p style="color:#666;font-size:13px;margin-top:24px">Ogni servizio è prenotato col rispettivo fornitore. Flygetr non organizza pacchetti turistici.</p>
    </div>
  `;

  await sendTransactionalEmail({
    to: input.to,
    subject: title,
    html,
    text,
  }).catch((err) => console.error('[email] booking confirm', err));
}
