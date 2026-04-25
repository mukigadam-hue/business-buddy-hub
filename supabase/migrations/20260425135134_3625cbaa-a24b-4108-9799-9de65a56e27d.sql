CREATE OR REPLACE FUNCTION public.check_booking_conflict(_asset_id uuid, _start timestamp with time zone, _end timestamp with time zone, _exclude_booking_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_units integer;
  overlapping integer;
BEGIN
  SELECT COALESCE(NULLIF(total_rooms, 0), 1) INTO total_units
  FROM public.property_assets
  WHERE id = _asset_id;

  IF total_units IS NULL THEN total_units := 1; END IF;

  SELECT COUNT(*) INTO overlapping
  FROM public.property_bookings
  WHERE asset_id = _asset_id
    AND status IN ('confirmed', 'active', 'pending')
    AND (_exclude_booking_id IS NULL OR id != _exclude_booking_id)
    AND start_date < _end
    AND end_date > _start;

  RETURN overlapping >= total_units;
END;
$function$;