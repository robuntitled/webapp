-- Verifica telefono (OTP) + badge "Numero verificato"
-- Applica: npm run db:phone-verify

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_otp_hash text,
  ADD COLUMN IF NOT EXISTS phone_otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_otp_attempts int NOT NULL DEFAULT 0;

-- Un solo account verificato per numero (NULL multipli ok in PostgreSQL UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_unique_idx
  ON users (phone_e164)
  WHERE phone_e164 IS NOT NULL AND phone_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_phone_verified_at_idx
  ON users (phone_verified_at)
  WHERE phone_verified_at IS NOT NULL;
