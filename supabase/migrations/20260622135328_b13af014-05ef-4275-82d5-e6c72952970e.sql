
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_business_activity(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT public.is_business_member(auth.uid(), _business_id) THEN RETURN; END IF;
  UPDATE public.businesses SET last_active_at = now() WHERE id = _business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_country_business_counts()
RETURNS TABLE(country_code text, business_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(country_code, ''), 'XX') AS country_code, COUNT(*)::bigint AS business_count
  FROM public.businesses
  WHERE is_discoverable = true
  GROUP BY COALESCE(NULLIF(country_code, ''), 'XX')
  ORDER BY business_count DESC, country_code ASC;
$$;

GRANT EXECUTE ON FUNCTION public.touch_business_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_country_business_counts() TO authenticated, anon;
