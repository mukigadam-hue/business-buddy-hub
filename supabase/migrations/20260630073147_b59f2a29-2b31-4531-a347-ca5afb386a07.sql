
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS receipt_watermark_url text,
  ADD COLUMN IF NOT EXISTS receipt_watermark_text text,
  ADD COLUMN IF NOT EXISTS receipt_watermark_size integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS receipt_watermark_opacity numeric NOT NULL DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS receipt_watermark_repeat integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS receipt_watermark_rotation integer NOT NULL DEFAULT -30;
