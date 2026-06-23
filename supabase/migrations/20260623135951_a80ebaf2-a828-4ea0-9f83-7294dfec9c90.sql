
-- 1. app_config: restrict reads to authenticated only
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;
CREATE POLICY "Authenticated can read app config"
  ON public.app_config FOR SELECT
  TO authenticated
  USING (true);

-- 2. businesses.settings_password: hide from table API (use RPCs only)
REVOKE SELECT (settings_password) ON public.businesses FROM anon, authenticated;

-- 3. property_bookings: add renter UPDATE policy + restrict member SELECT to owner/admin
DROP POLICY IF EXISTS "Members can view bookings" ON public.property_bookings;
CREATE POLICY "Owners and admins can view bookings"
  ON public.property_bookings FOR SELECT
  TO authenticated
  USING (public.is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Renters can update own bookings"
  ON public.property_bookings FOR UPDATE
  TO authenticated
  USING (renter_id = auth.uid())
  WITH CHECK (renter_id = auth.uid());

-- 4. realtime.messages: add explicit deny-all policies (app uses postgres_changes/CDC only,
--    which is governed by RLS on source tables — broadcast/presence is not used)
DROP POLICY IF EXISTS "Deny realtime broadcast and presence" ON realtime.messages;
CREATE POLICY "Deny realtime broadcast and presence"
  ON realtime.messages
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
