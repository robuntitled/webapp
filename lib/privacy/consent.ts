import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/constants';

export function buildPrivacyConsentFields(accepted: boolean) {
  const now = new Date().toISOString();
  return {
    privacy_consent: accepted,
    privacy_consent_at: accepted ? now : null,
    privacy_policy_version: accepted ? PRIVACY_POLICY_VERSION : null,
    terms_accepted_at: accepted ? now : null,
  };
}

export function buildMarketingConsentFields(optedIn: boolean) {
  const now = new Date().toISOString();
  return {
    marketing_consent: optedIn,
    marketing_consent_at: optedIn ? now : null,
    email_notifications: optedIn,
  };
}

export function isMinimumAge(birthDate: Date, minYears: number): boolean {
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - minYears,
    today.getMonth(),
    today.getDate()
  );
  return birthDate <= cutoff;
}