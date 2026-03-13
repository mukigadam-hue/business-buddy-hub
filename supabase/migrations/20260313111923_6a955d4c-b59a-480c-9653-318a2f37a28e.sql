
ALTER TABLE public.property_bookings 
ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'monthly';

COMMENT ON COLUMN public.property_bookings.payment_frequency IS 'How often rent is paid: monthly, quarterly, biannual, annual, one-time';
