-- Wallet crediti prenotazioni (cashback su commissione LiteAPI).
-- Accesso solo via service_role (supabaseAdmin): niente policy per anon/authenticated.

CREATE TABLE IF NOT EXISTS public.user_credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('earn', 'spend', 'adjust', 'reversal')),
  amount_cents integer NOT NULL CHECK (amount_cents <> 0),
  balance_after_cents integer NOT NULL CHECK (balance_after_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  provider text NOT NULL DEFAULT 'liteapi' CHECK (provider IN ('liteapi', 'manual')),
  booking_kind text CHECK (booking_kind IN ('hotel', 'flight')),
  external_ref text,
  booking_id text,
  booking_ref text,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  booking_amount_cents integer,
  commission_cents integer,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotenza: un solo earn per prenotazione (provider + ref + tipo).
CREATE UNIQUE INDEX IF NOT EXISTS user_credit_ledger_earn_unique_idx
  ON public.user_credit_ledger (provider, external_ref, entry_type)
  WHERE entry_type = 'earn' AND external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_credit_ledger_user_created_idx
  ON public.user_credit_ledger (user_id, created_at DESC);

ALTER TABLE public.user_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_credit_wallets FROM anon, authenticated;
REVOKE ALL ON public.user_credit_ledger FROM anon, authenticated;

COMMENT ON TABLE public.user_credit_wallets IS 'Saldo crediti NomadLink (cashback su commissioni booking).';
COMMENT ON TABLE public.user_credit_ledger IS 'Movimenti wallet: earn post-book LiteAPI, spend/reversal futuri.';

-- Accredito atomico (evita race su saldo). Ritorna: credited, credit_cents, balance_cents, reason.
CREATE OR REPLACE FUNCTION public.earn_booking_credit(
  p_user_id uuid,
  p_external_ref text,
  p_credit_cents integer,
  p_booking_kind text,
  p_booking_id text DEFAULT NULL,
  p_booking_ref text DEFAULT NULL,
  p_trip_id uuid DEFAULT NULL,
  p_booking_amount_cents integer DEFAULT NULL,
  p_commission_cents integer DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  credited boolean,
  credit_cents integer,
  balance_cents integer,
  currency text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_currency text;
  v_new_balance integer;
BEGIN
  IF p_credit_cents IS NULL OR p_credit_cents <= 0 THEN
    SELECT w.balance_cents, w.currency INTO v_balance, v_currency
    FROM public.user_credit_wallets w WHERE w.user_id = p_user_id;
    credited := false;
    credit_cents := 0;
    balance_cents := COALESCE(v_balance, 0);
    currency := COALESCE(v_currency, 'EUR');
    reason := 'zero';
    RETURN NEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_credit_ledger l
    WHERE l.provider = 'liteapi'
      AND l.external_ref = p_external_ref
      AND l.entry_type = 'earn'
  ) THEN
    SELECT w.balance_cents, w.currency INTO v_balance, v_currency
    FROM public.user_credit_wallets w WHERE w.user_id = p_user_id;
    credited := false;
    credit_cents := 0;
    balance_cents := COALESCE(v_balance, 0);
    currency := COALESCE(v_currency, 'EUR');
    reason := 'duplicate';
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.user_credit_wallets (user_id, balance_cents, currency, updated_at)
  VALUES (p_user_id, 0, 'EUR', now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT w.balance_cents, w.currency INTO v_balance, v_currency
  FROM public.user_credit_wallets w
  WHERE w.user_id = p_user_id
  FOR UPDATE;

  v_new_balance := v_balance + p_credit_cents;

  UPDATE public.user_credit_wallets
  SET balance_cents = v_new_balance, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.user_credit_ledger (
    user_id, entry_type, amount_cents, balance_after_cents, currency,
    provider, booking_kind, external_ref, booking_id, booking_ref, trip_id,
    booking_amount_cents, commission_cents, meta
  ) VALUES (
    p_user_id, 'earn', p_credit_cents, v_new_balance, 'EUR',
    'liteapi', p_booking_kind, p_external_ref, p_booking_id, p_booking_ref, p_trip_id,
    p_booking_amount_cents, p_commission_cents, COALESCE(p_meta, '{}'::jsonb)
  );

  credited := true;
  credit_cents := p_credit_cents;
  balance_cents := v_new_balance;
  currency := 'EUR';
  reason := 'ok';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.earn_booking_credit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.earn_booking_credit TO service_role;
