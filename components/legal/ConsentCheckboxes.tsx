'use client';

import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';

type ConsentCheckboxesProps = {
  privacyAccepted: boolean;
  termsAccepted: boolean;
  marketingAccepted: boolean;
  onPrivacyChange: (value: boolean) => void;
  onTermsChange: (value: boolean) => void;
  onMarketingChange: (value: boolean) => void;
  showMarketing?: boolean;
};

export function ConsentCheckboxes({
  privacyAccepted,
  termsAccepted,
  marketingAccepted,
  onPrivacyChange,
  onTermsChange,
  onMarketingChange,
  showMarketing = true,
}: ConsentCheckboxesProps) {
  return (
    <div className="space-y-3 text-left">
      <div className="flex items-start space-x-2">
        <Checkbox
          id="privacy-consent"
          checked={privacyAccepted}
          onCheckedChange={(v) => onPrivacyChange(v === true)}
        />
        <label htmlFor="privacy-consent" className="text-sm leading-snug text-slate-600">
          Ho letto e accetto l&apos;
          <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
            Informativa Privacy
          </Link>{' '}
          (obbligatorio) *
        </label>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms-consent"
          checked={termsAccepted}
          onCheckedChange={(v) => onTermsChange(v === true)}
        />
        <label htmlFor="terms-consent" className="text-sm leading-snug text-slate-600">
          Ho letto e accetto i{' '}
          <Link href="/termini" className="text-blue-600 hover:underline" target="_blank">
            Termini di Servizio
          </Link>{' '}
          (obbligatorio) *
        </label>
      </div>
      {showMarketing && (
        <div className="flex items-start space-x-2">
          <Checkbox
            id="marketing-consent"
            checked={marketingAccepted}
            onCheckedChange={(v) => onMarketingChange(v === true)}
          />
          <label htmlFor="marketing-consent" className="text-sm leading-snug text-slate-600">
            Acconsento a ricevere comunicazioni promozionali via email (facoltativo)
          </label>
        </div>
      )}
    </div>
  );
}