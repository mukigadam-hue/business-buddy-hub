
-- Step 1: Replace the generate_business_code function with a secure alphanumeric version
-- Uses chars A-Z, 2-9 (excludes 0,O,1,I,L to avoid confusion) = 30 chars
-- 8 chars = 30^8 = ~65.6 billion combinations (safe for 10M+ users)
-- Includes retry loop to guarantee uniqueness

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
BEGIN
  IF NEW.business_code IS NULL OR NEW.business_code = '' THEN
    LOOP
      attempt := attempt + 1;
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
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

-- Step 2: Add unique constraint to guarantee database-level uniqueness
ALTER TABLE public.businesses ADD CONSTRAINT businesses_business_code_unique UNIQUE (business_code);

-- Step 3: Update default value to use the same charset
ALTER TABLE public.businesses 
  ALTER COLUMN business_code SET DEFAULT NULL;
