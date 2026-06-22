CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS recovery_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_changed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles(phone) WHERE phone <> '';

-- Allow looking up whether a phone is already registered, without exposing PII.
CREATE OR REPLACE FUNCTION public.phone_exists(_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE phone = _phone AND phone <> '');
$$;

GRANT EXECUTE ON FUNCTION public.phone_exists(TEXT) TO anon, authenticated;

-- Self-service: signed-in user updates their own recovery email + verification status (after Google link).
CREATE OR REPLACE FUNCTION public.mark_account_verified(_recovery_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles
     SET recovery_email = COALESCE(NULLIF(_recovery_email, ''), recovery_email),
         verification_status = 'verified'
   WHERE id = auth.uid();
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_account_verified(TEXT) TO authenticated;

-- Self-service: change registered phone after PIN verification (PIN check happens in edge fn).
CREATE OR REPLACE FUNCTION public.update_registered_phone(_new_phone TEXT, _new_country_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = _new_phone AND id <> auth.uid()) THEN
    RAISE EXCEPTION 'Phone already in use';
  END IF;
  UPDATE public.profiles
     SET phone = _new_phone,
         country_code = COALESCE(NULLIF(_new_country_code, ''), country_code),
         phone_changed_at = now()
   WHERE id = auth.uid();
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_registered_phone(TEXT, TEXT) TO authenticated;