
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Update existing paid orders
UPDATE public.orders SET amount_paid = grand_total, balance = 0, payment_status = 'paid' WHERE status = 'paid';
UPDATE public.orders SET amount_paid = grand_total, balance = 0, payment_status = 'paid' WHERE status = 'completed';
