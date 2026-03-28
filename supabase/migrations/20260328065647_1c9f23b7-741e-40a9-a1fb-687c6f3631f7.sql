CREATE OR REPLACE FUNCTION public.auto_grant_ceo_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IN ('ndamson8@gmail.com', 'mukigadam@gmail.com', 'ampurix86b@gmail.com') THEN
    NEW.is_premium := true;
  END IF;
  RETURN NEW;
END;
$$;