
-- Add payment tracking columns to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0;

-- Backfill existing services as fully paid
UPDATE public.services SET amount_paid = cost, balance = 0, payment_status = 'paid';
