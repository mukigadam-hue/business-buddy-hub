
-- Add read_at column to track when notification was first opened
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamp with time zone DEFAULT NULL;

-- Backfill: mark already-read notifications as read "now" so they get cleaned up in 7 days
UPDATE public.notifications SET read_at = now() WHERE is_read = true AND read_at IS NULL;

-- Function to delete read notifications older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_read_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = true
    AND read_at IS NOT NULL
    AND read_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
