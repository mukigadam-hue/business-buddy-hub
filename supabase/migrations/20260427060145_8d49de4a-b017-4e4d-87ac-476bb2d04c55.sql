ALTER TABLE public.property_bookings
  ADD COLUMN IF NOT EXISTS requested_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS counter_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS negotiation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS negotiation_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS final_agreed_price numeric NOT NULL DEFAULT 0;