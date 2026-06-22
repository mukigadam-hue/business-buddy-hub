
-- 1) Protect businesses.settings_password from being read via the table API
REVOKE SELECT (settings_password) ON public.businesses FROM anon, authenticated;

-- 2) Scope invite_codes policies to authenticated users only
DROP POLICY IF EXISTS "Owner/admin can create invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Owner/admin can update invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Owner/admin can view invite codes" ON public.invite_codes;

CREATE POLICY "Owner/admin can create invite codes"
  ON public.invite_codes FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Owner/admin can update invite codes"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Owner/admin can view invite codes"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (public.is_owner_or_admin(auth.uid(), business_id));

-- 3) Restrict property_check_ins INSERT to business members or the booking's renter
DROP POLICY IF EXISTS "Authenticated can add check-ins" ON public.property_check_ins;
CREATE POLICY "Members or renter can add check-ins"
  ON public.property_check_ins FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = auth.uid()
    AND (
      public.is_business_member(auth.uid(), business_id)
      OR EXISTS (
        SELECT 1 FROM public.property_bookings b
        WHERE b.id = property_check_ins.booking_id
          AND b.renter_id = auth.uid()
      )
    )
  );

-- 4) Allow signed-in users to read payment proofs (bucket is public; ensures business members can fetch other uploaders' proofs)
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can view payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs');
