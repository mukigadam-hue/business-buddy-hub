-- Add unit_type column to stock_items table
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'Pieces';

-- Note: purchase_items already has a 'quality' column that factory uses for unit_type
-- We keep the existing pattern for backward compatibility