-- Add buying_price column to stock_items (cost price from suppliers)
ALTER TABLE public.stock_items ADD COLUMN buying_price numeric NOT NULL DEFAULT 0;

-- Initialize buying_price from existing wholesale_price as a reasonable default
UPDATE public.stock_items SET buying_price = wholesale_price;