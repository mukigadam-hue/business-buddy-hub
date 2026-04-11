
-- Create a function to verify settings password without exposing it
CREATE OR REPLACE FUNCTION public.verify_settings_password(_business_id uuid, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id
      AND settings_password IS NOT NULL
      AND settings_password != ''
      AND settings_password = _password
      AND public.is_business_member(auth.uid(), _business_id)
  );
$$;

-- Create a function to check if a business has a settings password
CREATE OR REPLACE FUNCTION public.has_settings_password(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id
      AND settings_password IS NOT NULL
      AND settings_password != ''
      AND public.is_business_member(auth.uid(), _business_id)
  );
$$;
