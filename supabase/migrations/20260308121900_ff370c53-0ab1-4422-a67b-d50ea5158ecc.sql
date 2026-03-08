-- Add from_order_id to factory_expenses for parity
ALTER TABLE public.factory_expenses ADD COLUMN IF NOT EXISTS from_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;