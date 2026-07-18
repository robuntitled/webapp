-- Verifica email per registrazione credentials (anti account-takeover).
-- Applica con: npm run db:email-verify
-- Oppure: npm run db:exec -- supabase/migrations/009_email_verification.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_verify_token_hash text,
  ADD COLUMN IF NOT EXISTS email_verify_expires_at timestamptz;

-- Account già presenti: non bloccare nessuno in produzione
UPDATE users
SET email_verified_at = COALESCE(email_verified_at, "createdAt", now())
WHERE email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS users_email_verify_token_hash_idx
  ON users (email_verify_token_hash)
  WHERE email_verify_token_hash IS NOT NULL;
