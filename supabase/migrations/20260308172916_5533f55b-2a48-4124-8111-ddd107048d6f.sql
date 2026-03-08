
-- Add products_description column for business discovery
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS products_description text NOT NULL DEFAULT '';

-- Create a security definer function to search businesses publicly
CREATE OR REPLACE FUNCTION public.search_businesses(_query text DEFAULT '', _limit int DEFAULT 20, _offset int DEFAULT 0)
RETURNS TABLE(
  id uuid,
  name text,
  business_type text,
  address text,
  contact text,
  email text,
  logo_url text,
  business_code text,
  products_description text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.id, b.name, b.business_type, b.address, b.contact, b.email, b.logo_url, b.business_code, b.products_description
  FROM public.businesses b
  WHERE 
    _query = '' OR
    b.name ILIKE '%' || _query || '%' OR
    b.business_type ILIKE '%' || _query || '%' OR
    b.address ILIKE '%' || _query || '%' OR
    b.products_description ILIKE '%' || _query || '%'
  ORDER BY b.name ASC
  LIMIT _limit
  OFFSET _offset;
$$;
