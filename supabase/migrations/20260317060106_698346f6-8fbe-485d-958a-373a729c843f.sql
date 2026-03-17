
-- Add serial_numbers column to sale_items
ALTER TABLE public.sale_items ADD COLUMN serial_numbers text NOT NULL DEFAULT '';

-- Add serial_numbers column to purchase_items
ALTER TABLE public.purchase_items ADD COLUMN serial_numbers text NOT NULL DEFAULT '';

-- Add serial_numbers column to order_items
ALTER TABLE public.order_items ADD COLUMN serial_numbers text NOT NULL DEFAULT '';
