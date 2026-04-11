-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN phone text NOT NULL DEFAULT '';

-- Create a SECURITY DEFINER function to look up masked email by phone
CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(_phone text)
RETURNS TABLE(masked_email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_email text;
  at_pos int;
  local_part text;
  domain_part text;
BEGIN
  SELECT p.email INTO raw_email
  FROM public.profiles p
  WHERE p.phone = _phone AND p.phone != ''
  LIMIT 1;

  IF raw_email IS NULL THEN
    RETURN;
  END IF;

  at_pos := position('@' in raw_email);
  local_part := left(raw_email, at_pos - 1);
  domain_part := substring(raw_email from at_pos);

  IF length(local_part) <= 2 THEN
    masked_email := local_part || '***' || domain_part;
  ELSE
    masked_email := left(local_part, 2) || repeat('*', greatest(length(local_part) - 2, 3)) || domain_part;
  END IF;

  RETURN NEXT;
END;
$$;

-- Update the handle_new_user trigger to also store phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;