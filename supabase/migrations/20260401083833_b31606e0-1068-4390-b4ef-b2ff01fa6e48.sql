
-- 1. Fix business_memberships INSERT policy: remove self-insertion as owner clause
DROP POLICY IF EXISTS "Owner/admin can add members" ON public.business_memberships;
CREATE POLICY "Owner/admin can add members"
  ON public.business_memberships
  FOR INSERT
  TO public
  WITH CHECK (is_owner_or_admin(auth.uid(), business_id));

-- 2. Remove overly broad payment methods SELECT policy
DROP POLICY IF EXISTS "Authenticated can view any business payment methods" ON public.business_payment_methods;

-- 3. Fix storage policies: scope DELETE/UPDATE to file owners via path
-- business-logos
DROP POLICY IF EXISTS "Authenticated users can delete business logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete business logos"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can update business logos" ON storage.objects;
CREATE POLICY "Authenticated users can update business logos"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

-- item-images
DROP POLICY IF EXISTS "Authenticated users can delete item images" ON storage.objects;
CREATE POLICY "Authenticated users can delete item images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'item-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can update item images" ON storage.objects;
CREATE POLICY "Authenticated users can update item images"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'item-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);

-- payment-proofs
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can delete payment proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can view payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Add UPDATE policy for invite_codes
CREATE POLICY "Owner/admin can update invite codes"
  ON public.invite_codes
  FOR UPDATE
  TO public
  USING (is_owner_or_admin(auth.uid(), business_id));
