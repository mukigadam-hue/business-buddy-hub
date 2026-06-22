-- Make last_active_at reflect REAL activity, not the time the column was added.
-- 1) Allow NULL so "never opened since tracking started" can be distinguished from "long inactive".
-- 2) For all existing rows, reset last_active_at to created_at — backfill from the column-add migration
--    incorrectly showed every dormant business as "just active". Real heartbeats from
--    touch_business_activity will overwrite this naturally as users open each business.
ALTER TABLE public.businesses ALTER COLUMN last_active_at DROP NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN last_active_at DROP DEFAULT;
UPDATE public.businesses SET last_active_at = created_at;