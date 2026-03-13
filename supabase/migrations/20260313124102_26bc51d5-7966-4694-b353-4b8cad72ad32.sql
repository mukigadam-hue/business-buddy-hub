
-- Add bulk packaging columns to stock_items
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS pieces_per_carton integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cartons_per_box integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boxes_per_container integer NOT NULL DEFAULT 0;

-- Also add to factory_raw_materials for factory bulk purchases
ALTER TABLE public.factory_raw_materials
  ADD COLUMN IF NOT EXISTS pieces_per_carton integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cartons_per_box integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boxes_per_container integer NOT NULL DEFAULT 0;
