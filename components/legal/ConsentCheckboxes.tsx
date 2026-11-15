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

/**
 * P1-13: una sola casella obbligatoria «18+ e Termini».
 * L'Informativa Privacy si legge (link), non si «accetta» con checkbox.
 * Compatibilità API: la casella unica aggiorna sia terms sia privacyAccepted.
 */
export function ConsentCheckboxes({
  privacyAccepted: _privacyAccepted,
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
          id="terms-age-consent"
          checked={termsAccepted}
          onCheckedChange={(v) => {
            const on = v === true;
            onTermsChange(on);
            onPrivacyChange(on);
          }}
          data-testid="consent-terms-age"
        />
        <label
          htmlFor="terms-age-consent"
          className={cn('leading-snug text-slate-600', compact ? 'text-xs' : 'text-sm')}
        >
          Ho almeno 18 anni e accetto i{' '}
          <Link href="/termini" className="text-primary hover:underline" target="_blank">
            Termini di servizio
          </Link>{' '}
          *
        </label>
      </div>
      <p
        className={cn(
          'pl-6 leading-snug text-slate-500',
          compact ? 'text-[11px]' : 'text-xs'
        )}
      >
        Continuando dichiari di aver letto l&apos;
        <Link href="/privacy" className="text-primary hover:underline" target="_blank">
          Informativa privacy
        </Link>
        .
      </p>
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
