'use client';

import {
  formatHotelCancellationLabel,
  payAtPropertyLines,
  taxesIncludedLabel,
  type HotelTaxFee,
} from '@/lib/liteapi/hotel-rate-disclosures';

type Props = {
  taxesAndFees?: HotelTaxFee[] | null;
  refundable?: boolean;
  freeCancellationUntil?: string | null;
  className?: string;
};

export function HotelRateDisclosures({
  taxesAndFees = null,
  refundable = false,
  freeCancellationUntil = null,
  className,
}: Props) {
  const cancellation = formatHotelCancellationLabel({
    refundable,
    freeCancelUntil: freeCancellationUntil,
  });
  const atProperty = payAtPropertyLines(taxesAndFees);
  const included = taxesIncludedLabel(taxesAndFees);

  if (!cancellation && !atProperty.length && !included) return null;

  return (
    <div className={className ?? 'space-y-1 text-[11px] leading-relaxed text-muted-foreground'}>
      {cancellation ? <p>{cancellation}</p> : null}
      {included ? <p>{included}</p> : null}
      {atProperty.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
