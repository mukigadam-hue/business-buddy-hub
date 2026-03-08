
CREATE OR REPLACE FUNCTION public.generate_business_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code TEXT;
  code_exists BOOLEAN;
  max_attempts INT := 10;
  attempt INT := 0;
  prefix TEXT;
BEGIN
  IF NEW.business_code IS NULL OR NEW.business_code = '' THEN
    prefix := COALESCE(NULLIF(UPPER(TRIM(NEW.country_code)), ''), 'XX');
    
    LOOP
      attempt := attempt + 1;
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      new_code := prefix || '-' || new_code;
      
      SELECT EXISTS(SELECT 1 FROM public.businesses WHERE business_code = new_code) INTO code_exists;
      
      IF NOT code_exists THEN
        NEW.business_code := new_code;
        EXIT;
      END IF;
      
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique business code after % attempts', max_attempts;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
