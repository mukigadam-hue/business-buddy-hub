ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS is_unmeasurable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_unit_type text,
  ADD COLUMN IF NOT EXISTS conversion_factor integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_stock_base_units numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_cost_per_base_unit numeric NOT NULL DEFAULT 0;