
-- Add gender, age, agreed_amount, payment_method, payment_date columns to property_bookings
ALTER TABLE public.property_bookings 
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS agreed_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS expected_payment_date timestamp with time zone;

-- Add gender, age, occupation, rental_purpose, start_date, end_date, agreed_amount to business_team_members for property tenants
ALTER TABLE public.business_team_members
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS occupation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rental_purpose text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rental_end_date date,
  ADD COLUMN IF NOT EXISTS agreed_amount numeric NOT NULL DEFAULT 0;
