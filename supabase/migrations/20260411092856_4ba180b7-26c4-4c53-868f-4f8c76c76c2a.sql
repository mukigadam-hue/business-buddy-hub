
-- Fix: Scope payment-proofs INSERT to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;

-- Find and replace any existing INSERT policy for payment-proofs
DO $$
BEGIN
  -- Drop all INSERT policies on storage.objects that reference payment-proofs
  PERFORM 1; -- placeholder, policies dropped above
END $$;

CREATE POLICY "Users can upload payment proofs to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
