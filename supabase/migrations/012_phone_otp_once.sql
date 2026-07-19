-- Un solo invio OTP a vita (fino a verifica). Anti-abuso bot / costi WhatsApp.
-- Applica: npm run db:exec -- supabase/migrations/012_phone_otp_once.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_otp_send_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_otp_sent_at timestamptz;

COMMENT ON COLUMN users.phone_otp_send_count IS 'Invii OTP (WhatsApp/SMS). Max 1 finché non verificato.';
