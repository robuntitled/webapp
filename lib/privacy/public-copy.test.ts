import { describe, expect, it } from 'vitest';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { getCompanyProfile } from '@/lib/privacy/company';
import { isPlaceholder } from '@/lib/privacy/is-placeholder';
import { collectFooterVisibleCopy, collectCompanyIdentityCopy } from '@/lib/privacy/public-copy';

describe('no visible legal placeholders', () => {
  it('compliance copy has no TODO or LEGAL_ tokens', () => {
    for (const value of Object.values(COMPLIANCE_COPY)) {
      expect(String(value)).not.toMatch(/TODO|LEGAL_|da definire/i);
    }
    expect(COMPLIANCE_COPY).not.toHaveProperty('checkoutMerchantLegalTodo');
  });

  it('footer and booking note strings with default company profile', () => {
    const company = getCompanyProfile();
    const footer = collectFooterVisibleCopy(company);
    const booking = [
      COMPLIANCE_COPY.separateBooking,
      COMPLIANCE_COPY.checkoutMerchantOfRecord,
      COMPLIANCE_COPY.hotelServiceFeeIncluded,
    ].join(' ');
    for (const chunk of [...footer, booking, ...collectCompanyIdentityCopy(company)]) {
      expect(chunk).not.toMatch(/TODO|LEGAL_|da definire/i);
    }
    if (isPlaceholder(company.privacyEmail)) {
      expect(footer.join(' ')).not.toMatch(/privacy:/i);
    }
  });
});
