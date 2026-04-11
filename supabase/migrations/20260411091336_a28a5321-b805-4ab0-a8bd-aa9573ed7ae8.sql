
-- Fix RLS: allow browsing ALL non-deleted assets (not just available ones)
DROP POLICY IF EXISTS "Anyone can browse available assets" ON public.property_assets;

CREATE POLICY "Anyone can browse assets"
ON public.property_assets
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- Update search function to include booked_units and available_units
DROP FUNCTION IF EXISTS public.search_property_assets(text,text,text,numeric,numeric,timestamp with time zone,timestamp with time zone,integer,integer);

CREATE OR REPLACE FUNCTION public.search_property_assets(
  _query text DEFAULT '',
  _category text DEFAULT '',
  _location text DEFAULT '',
  _min_price numeric DEFAULT 0,
  _max_price numeric DEFAULT 999999999,
  _start_date timestamptz DEFAULT NULL,
  _end_date timestamptz DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, business_id uuid, name text, description text, category text,
  sub_category text, location text, area_size numeric, area_unit text,
  hourly_price numeric, daily_price numeric, monthly_price numeric,
  image_url_1 text, owner_name text, owner_contact text, features text,
  business_name text, business_contact text, total_rooms integer, room_size text,
  is_available boolean, booked_units integer, available_units integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.id, a.business_id, a.name, a.description, a.category, a.sub_category,
    a.location, a.area_size, a.area_unit, a.hourly_price, a.daily_price,
    a.monthly_price, a.image_url_1, a.owner_name, a.owner_contact, a.features,
    b.name AS business_name, b.contact AS business_contact,
    a.total_rooms, a.room_size, a.is_available,
    COALESCE((
      SELECT COUNT(*)::integer FROM public.property_bookings pb
      WHERE pb.asset_id = a.id AND pb.status IN ('confirmed', 'active')
    ), 0) AS booked_units,
    GREATEST(
      CASE WHEN a.total_rooms > 0 
        THEN a.total_rooms - COALESCE((
          SELECT COUNT(*)::integer FROM public.property_bookings pb
          WHERE pb.asset_id = a.id AND pb.status IN ('confirmed', 'active')
        ), 0)
        ELSE CASE WHEN a.is_available THEN 1 ELSE 0 END
      END,
      0
    )::integer AS available_units
  FROM public.property_assets a
  JOIN public.businesses b ON b.id = a.business_id
  WHERE a.deleted_at IS NULL
    AND (_category = '' OR a.category = _category)
    AND (_location = '' OR a.location ILIKE '%' || _location || '%')
    AND (a.daily_price >= _min_price)
    AND (a.daily_price <= _max_price OR _max_price = 999999999)
    AND (_query = '' OR a.name ILIKE '%' || _query || '%' OR a.description ILIKE '%' || _query || '%' OR a.location ILIKE '%' || _query || '%')
  ORDER BY a.is_available DESC, a.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;
