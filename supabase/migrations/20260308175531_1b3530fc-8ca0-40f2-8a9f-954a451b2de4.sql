
-- Add payment tracking columns to sales
ALTER TABLE public.sales ADD COLUMN payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.sales ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN balance numeric NOT NULL DEFAULT 0;

-- Add payment tracking columns to purchases
ALTER TABLE public.purchases ADD COLUMN payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.purchases ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN balance numeric NOT NULL DEFAULT 0;

-- Backfill existing records as fully paid
UPDATE public.sales SET amount_paid = grand_total, balance = 0, payment_status = 'paid';
UPDATE public.purchases SET amount_paid = grand_total, balance = 0, payment_status = 'paid';
