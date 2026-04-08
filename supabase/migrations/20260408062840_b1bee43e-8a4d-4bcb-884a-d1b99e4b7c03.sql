CREATE OR REPLACE FUNCTION public.search_businesses(_query text DEFAULT ''::text, _limit integer DEFAULT 20, _offset integer DEFAULT 0, _country_code text DEFAULT ''::text, _district text DEFAULT ''::text)
 RETURNS TABLE(id uuid, name text, business_type text, address text, contact text, email text, logo_url text, business_code text, products_description text, country_code text, district text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT b.id, b.name, b.business_type, b.address, b.contact, b.email, b.logo_url, b.business_code, b.products_description, b.country_code, b.district
  FROM public.businesses b
  WHERE 
    b.is_discoverable = true
    AND NOT EXISTS (
      SELECT 1 FROM public.business_blocks bl
      WHERE bl.business_id = b.id
      AND bl.blocked_business_id IN (
        SELECT bm.business_id FROM public.business_memberships bm WHERE bm.user_id = auth.uid()
      )
    )
    AND (
      _query = '' OR
      b.name ILIKE '%' || _query || '%' OR
      b.business_type ILIKE '%' || _query || '%' OR
      b.address ILIKE '%' || _query || '%' OR
      b.products_description ILIKE '%' || _query || '%' OR
      b.district ILIKE '%' || _query || '%'
    )
    AND (_country_code = '' OR b.country_code = _country_code)
    AND (_district = '' OR b.district ILIKE '%' || _district || '%' OR b.address ILIKE '%' || _district || '%')
  ORDER BY 
    CASE WHEN _country_code != '' AND b.country_code = _country_code THEN 0 ELSE 1 END,
    b.name ASC
  LIMIT _limit OFFSET _offset;
$function$;