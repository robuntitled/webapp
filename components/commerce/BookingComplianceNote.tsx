import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type Props = {
  /** Mostra la riga MoR LiteAPI/Nuitée + Noivia intermediario (checkout). */
  showMerchantOfRecord?: boolean;
  /** Hotel: totale già con commissione di servizio Noivia. */
  showHotelServiceFee?: boolean;
};

export function BookingComplianceNote({
  showMerchantOfRecord = false,
  showHotelServiceFee = false,
}: Props) {
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
      <p>{COMPLIANCE_COPY.separateBooking}</p>
      {showMerchantOfRecord ? (
        <p>{COMPLIANCE_COPY.checkoutMerchantOfRecord}</p>
      ) : null}
      {showHotelServiceFee ? (
        <p>{COMPLIANCE_COPY.hotelServiceFeeIncluded}</p>
      ) : null}
    </div>
  );
}
