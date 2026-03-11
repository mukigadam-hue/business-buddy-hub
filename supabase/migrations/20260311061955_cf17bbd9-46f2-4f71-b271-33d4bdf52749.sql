
-- Property Assets (listings)
CREATE TABLE public.property_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'land', -- land, vehicle, vessel
  sub_category TEXT NOT NULL DEFAULT '', -- car, motorcycle, trailer, boat, etc.
  location TEXT NOT NULL DEFAULT '',
  area_size NUMERIC NOT NULL DEFAULT 0,
  area_unit TEXT NOT NULL DEFAULT 'sqm', -- sqm, acres, hectares
  hourly_price NUMERIC NOT NULL DEFAULT 0,
  daily_price NUMERIC NOT NULL DEFAULT 0,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url_1 TEXT DEFAULT '',
  image_url_2 TEXT DEFAULT '',
  image_url_3 TEXT DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  owner_contact TEXT NOT NULL DEFAULT '',
  features TEXT NOT NULL DEFAULT '', -- comma-separated features
  rules TEXT NOT NULL DEFAULT '', -- rental rules
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Property Bookings
CREATE TABLE public.property_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.property_assets(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renter_name TEXT NOT NULL DEFAULT '',
  renter_contact TEXT NOT NULL DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration_type TEXT NOT NULL DEFAULT 'daily', -- hourly, daily, monthly
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, active, completed, cancelled
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, partial, paid
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Property Check-ins (condition documentation)
CREATE TABLE public.property_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.property_bookings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL DEFAULT 'start', -- start, end
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Property Conversations
CREATE TABLE public.property_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.property_assets(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Property Messages
CREATE TABLE public.property_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.property_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_messages ENABLE ROW LEVEL SECURITY;

-- RLS: property_assets
CREATE POLICY "Members can view assets" ON public.property_assets FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add assets" ON public.property_assets FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update assets" ON public.property_assets FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete assets" ON public.property_assets FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

-- Public browsing of available assets (for renters searching)
CREATE POLICY "Anyone can browse available assets" ON public.property_assets FOR SELECT TO authenticated USING (is_available = true AND deleted_at IS NULL);

-- RLS: property_bookings
CREATE POLICY "Members can view bookings" ON public.property_bookings FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Renters can view own bookings" ON public.property_bookings FOR SELECT TO authenticated USING (renter_id = auth.uid());
CREATE POLICY "Authenticated can create bookings" ON public.property_bookings FOR INSERT TO authenticated WITH CHECK (renter_id = auth.uid());
CREATE POLICY "Members can update bookings" ON public.property_bookings FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete bookings" ON public.property_bookings FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

-- RLS: property_check_ins
CREATE POLICY "Members can view check-ins" ON public.property_check_ins FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Authenticated can add check-ins" ON public.property_check_ins FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "Renters can view own check-ins" ON public.property_check_ins FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.property_bookings b WHERE b.id = property_check_ins.booking_id AND b.renter_id = auth.uid())
);

-- RLS: property_conversations
CREATE POLICY "Members can view conversations" ON public.property_conversations FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Renters can view own conversations" ON public.property_conversations FOR SELECT TO authenticated USING (renter_id = auth.uid());
CREATE POLICY "Authenticated can create conversations" ON public.property_conversations FOR INSERT TO authenticated WITH CHECK (renter_id = auth.uid());
CREATE POLICY "Members can update conversations" ON public.property_conversations FOR UPDATE USING (is_business_member(auth.uid(), business_id) OR renter_id = auth.uid());

-- RLS: property_messages
CREATE POLICY "Conversation participants can view messages" ON public.property_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.property_conversations c WHERE c.id = property_messages.conversation_id AND (is_business_member(auth.uid(), c.business_id) OR c.renter_id = auth.uid()))
);
CREATE POLICY "Conversation participants can send messages" ON public.property_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.property_conversations c WHERE c.id = property_messages.conversation_id AND (is_business_member(auth.uid(), c.business_id) OR c.renter_id = auth.uid()))
);
CREATE POLICY "Users can update own messages" ON public.property_messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_bookings;

-- Updated_at trigger for assets
CREATE TRIGGER update_property_assets_updated_at BEFORE UPDATE ON public.property_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check booking conflicts (prevent double bookings)
CREATE OR REPLACE FUNCTION public.check_booking_conflict(_asset_id UUID, _start TIMESTAMPTZ, _end TIMESTAMPTZ, _exclude_booking_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_bookings
    WHERE asset_id = _asset_id
      AND status IN ('confirmed', 'active')
      AND (_exclude_booking_id IS NULL OR id != _exclude_booking_id)
      AND start_date < _end
      AND end_date > _start
  );
$$;

-- Function to search available assets publicly
CREATE OR REPLACE FUNCTION public.search_property_assets(
  _query TEXT DEFAULT '',
  _category TEXT DEFAULT '',
  _location TEXT DEFAULT '',
  _min_price NUMERIC DEFAULT 0,
  _max_price NUMERIC DEFAULT 999999999,
  _start_date TIMESTAMPTZ DEFAULT NULL,
  _end_date TIMESTAMPTZ DEFAULT NULL,
  _limit INT DEFAULT 50,
  _offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID, business_id UUID, name TEXT, description TEXT, category TEXT, sub_category TEXT,
  location TEXT, area_size NUMERIC, area_unit TEXT, hourly_price NUMERIC, daily_price NUMERIC,
  monthly_price NUMERIC, image_url_1 TEXT, owner_name TEXT, owner_contact TEXT, features TEXT,
  business_name TEXT, business_contact TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.business_id, a.name, a.description, a.category, a.sub_category,
    a.location, a.area_size, a.area_unit, a.hourly_price, a.daily_price,
    a.monthly_price, a.image_url_1, a.owner_name, a.owner_contact, a.features,
    b.name AS business_name, b.contact AS business_contact
  FROM public.property_assets a
  JOIN public.businesses b ON b.id = a.business_id
  WHERE a.is_available = true AND a.deleted_at IS NULL
    AND (_category = '' OR a.category = _category)
    AND (_location = '' OR a.location ILIKE '%' || _location || '%')
    AND (a.daily_price >= _min_price)
    AND (a.daily_price <= _max_price OR _max_price = 999999999)
    AND (_query = '' OR a.name ILIKE '%' || _query || '%' OR a.description ILIKE '%' || _query || '%' OR a.location ILIKE '%' || _query || '%')
    AND (
      _start_date IS NULL OR _end_date IS NULL OR
      NOT EXISTS (
        SELECT 1 FROM public.property_bookings pb
        WHERE pb.asset_id = a.id AND pb.status IN ('confirmed', 'active')
          AND pb.start_date < _end_date AND pb.end_date > _start_date
      )
    )
  ORDER BY a.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;
