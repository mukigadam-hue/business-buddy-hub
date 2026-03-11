
-- Add asset_code to property_assets
ALTER TABLE public.property_assets ADD COLUMN IF NOT EXISTS asset_code text DEFAULT '';

-- Create function to generate asset codes
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code TEXT;
  code_exists BOOLEAN;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  IF NEW.asset_code IS NULL OR NEW.asset_code = '' THEN
    LOOP
      attempt := attempt + 1;
      new_code := 'AST-';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      
      SELECT EXISTS(SELECT 1 FROM public.property_assets WHERE asset_code = new_code) INTO code_exists;
      
      IF NOT code_exists THEN
        NEW.asset_code := new_code;
        EXIT;
      END IF;
      
      IF attempt >= max_attempts THEN
        NEW.asset_code := 'AST-' || substr(NEW.id::text, 1, 6);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for asset code generation
DROP TRIGGER IF EXISTS trigger_generate_asset_code ON public.property_assets;
CREATE TRIGGER trigger_generate_asset_code
  BEFORE INSERT ON public.property_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_asset_code();

-- Generate codes for existing assets that don't have one
UPDATE public.property_assets 
SET asset_code = 'AST-' || upper(substr(id::text, 1, 6))
WHERE asset_code IS NULL OR asset_code = '';

-- Add columns to property_bookings for collaborative workflow
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS owner_notes text DEFAULT '';
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS renter_occupation text DEFAULT '';
ALTER TABLE public.property_bookings ADD COLUMN IF NOT EXISTS rental_purpose text DEFAULT '';
