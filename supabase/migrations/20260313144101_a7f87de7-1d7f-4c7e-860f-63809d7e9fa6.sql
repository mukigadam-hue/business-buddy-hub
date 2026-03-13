
-- Business tips table for daily tips
CREATE TABLE public.business_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- App announcements table for admin messages to all users
CREATE TABLE public.app_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  announcement_type text NOT NULL DEFAULT 'info',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT NULL
);

-- RLS for business_tips: anyone authenticated can read
ALTER TABLE public.business_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tips" ON public.business_tips FOR SELECT TO authenticated USING (is_active = true);

-- RLS for app_announcements: anyone authenticated can read
ALTER TABLE public.app_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read announcements" ON public.app_announcements FOR SELECT TO authenticated USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
