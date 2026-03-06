
-- Add unique business_code to businesses for inter-app connections
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_code text UNIQUE;

-- Generate codes for existing businesses
UPDATE public.businesses 
SET business_code = UPPER(SUBSTRING(MD5(id::text || created_at::text) FROM 1 FOR 8))
WHERE business_code IS NULL;

-- Make it NOT NULL with a default
ALTER TABLE public.businesses ALTER COLUMN business_code SET DEFAULT UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 8));

-- Create function to auto-generate unique business code on insert
CREATE OR REPLACE FUNCTION public.generate_business_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_code IS NULL OR NEW.business_code = '' THEN
    NEW.business_code := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text || random()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate business code
CREATE TRIGGER set_business_code
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_business_code();

-- Add settings_password to businesses for boss-only settings access
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS settings_password text DEFAULT '';
