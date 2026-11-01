import { BookingComplianceNote } from '@/components/commerce/BookingComplianceNote';

export default function DemoCompliancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-2 text-2xl font-bold text-indigo-600">noivia</div>
          <h1 className="text-xl font-semibold text-slate-900">Hotel Checkout Demo</h1>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Note Legali
          </div>
          <BookingComplianceNote showMerchantOfRecord showHotelServiceFee />
        </div>
      </div>
    </div>
  );
}
