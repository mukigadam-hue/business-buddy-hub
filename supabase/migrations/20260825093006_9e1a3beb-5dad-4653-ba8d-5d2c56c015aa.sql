CREATE TABLE IF NOT EXISTS public.business_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL,
  visitor_country_code text NOT NULL DEFAULT '',
  visit_count integer NOT NULL DEFAULT 1,
  first_visited_at timestamptz NOT NULL DEFAULT now(),
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, visitor_id)
);

GRANT SELECT ON public.business_visits TO authenticated;
GRANT ALL ON public.business_visits TO service_role;
ALTER TABLE public.business_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view their visits" ON public.business_visits;
CREATE POLICY "Business members can view their visits"
ON public.business_visits FOR SELECT TO authenticated
USING (public.is_business_member(auth.uid(), business_id));

CREATE INDEX IF NOT EXISTS business_visits_business_idx ON public.business_visits(business_id, last_visited_at DESC);

CREATE OR REPLACE FUNCTION public.record_business_visit(_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cc text := '';
  _visitors integer := 0;
  _notif_id uuid;
BEGIN
  IF _uid IS NULL OR _business_id IS NULL THEN RETURN; END IF;
  -- never log or notify for the business's own team
  IF public.is_business_member(_uid, _business_id) THEN RETURN; END IF;

  SELECT COALESCE(country_code, '') INTO _cc FROM public.profiles WHERE id = _uid;

  INSERT INTO public.business_visits (business_id, visitor_id, visitor_country_code)
  VALUES (_business_id, _uid, COALESCE(_cc, ''))
  ON CONFLICT (business_id, visitor_id) DO UPDATE
    SET visit_count = public.business_visits.visit_count + 1,
        last_visited_at = now(),
        visitor_country_code = COALESCE(NULLIF(EXCLUDED.visitor_country_code, ''), public.business_visits.visitor_country_code);

  SELECT count(*) INTO _visitors
  FROM public.business_visits
  WHERE business_id = _business_id AND last_visited_at >= (now() - interval '24 hours');

  SELECT id INTO _notif_id
  FROM public.notifications
  WHERE business_id = _business_id AND type = 'visitor' AND is_read = false
    AND created_at >= (now() - interval '24 hours')
  ORDER BY created_at DESC LIMIT 1;

  IF _notif_id IS NOT NULL THEN
    UPDATE public.notifications
      SET message = 'count=' || _visitors::text, created_at = now()
      WHERE id = _notif_id;
  ELSE
    INSERT INTO public.notifications (business_id, type, title, message, is_read)
    VALUES (_business_id, 'visitor', 'New visitors', 'count=' || _visitors::text, false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_visitors(_business_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(country_code text, visit_count integer, last_visited_at timestamptz, first_visited_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.visitor_country_code, v.visit_count, v.last_visited_at, v.first_visited_at
  FROM public.business_visits v
  WHERE v.business_id = _business_id
    AND public.is_business_member(auth.uid(), _business_id)
  ORDER BY v.last_visited_at DESC
  LIMIT COALESCE(_limit, 50);
$$;

GRANT EXECUTE ON FUNCTION public.record_business_visit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_visitors(uuid, integer) TO authenticated;