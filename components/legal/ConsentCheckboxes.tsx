'use client';

import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type ConsentCheckboxesProps = {
  privacyAccepted: boolean;
  termsAccepted: boolean;
  marketingAccepted: boolean;
  onPrivacyChange: (value: boolean) => void;
  onTermsChange: (value: boolean) => void;
  onMarketingChange: (value: boolean) => void;
  showMarketing?: boolean;
  compact?: boolean;
};

export function ConsentCheckboxes({
  privacyAccepted,
  termsAccepted,
  marketingAccepted,
  onPrivacyChange,
  onTermsChange,
  onMarketingChange,
  showMarketing = true,
  compact = false,
}: ConsentCheckboxesProps) {
  return (
    <div className={cn('text-left', compact ? 'space-y-2' : 'space-y-3')}>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="privacy-consent"
          checked={privacyAccepted}
          onCheckedChange={(v) => onPrivacyChange(v === true)}
        />
        <label
          htmlFor="privacy-consent"
          className={cn('leading-snug text-slate-600', compact ? 'text-xs' : 'text-sm')}
        >
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
        <label
          htmlFor="terms-consent"
          className={cn('leading-snug text-slate-600', compact ? 'text-xs' : 'text-sm')}
        >
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
          <label
            htmlFor="marketing-consent"
            className={cn('leading-snug text-slate-600', compact ? 'text-xs' : 'text-sm')}
          >
            Acconsento a ricevere comunicazioni promozionali via email (facoltativo)
          </label>
        </div>
      )}
    </div>
  );
}