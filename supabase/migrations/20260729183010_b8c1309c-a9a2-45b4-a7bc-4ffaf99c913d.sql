CREATE POLICY "receipt_exports_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipt-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipt_exports_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipt-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipt_exports_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'receipt-exports' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'receipt-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipt_exports_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipt-exports' AND (storage.foldername(name))[1] = auth.uid()::text);