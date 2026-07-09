-- GDPR: tracciamento consensi e versione informativa
-- Applica con: npm run db:gdpr

ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_version text;

-- Backfill utenti esistenti con consenso già registrato
UPDATE users
SET
  privacy_consent_at = COALESCE(privacy_consent_at, "createdAt"),
  terms_accepted_at = COALESCE(terms_accepted_at, "createdAt"),
  privacy_policy_version = COALESCE(privacy_policy_version, '1.0')
WHERE privacy_consent = true;

UPDATE users
SET
  marketing_consent_at = COALESCE(marketing_consent_at, "createdAt")
WHERE marketing_consent = true;