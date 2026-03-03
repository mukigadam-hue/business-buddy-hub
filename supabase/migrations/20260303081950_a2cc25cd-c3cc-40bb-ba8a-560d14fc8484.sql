
-- Create storage buckets for business logos and item images
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Storage policies for business-logos
CREATE POLICY "Anyone can view business logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can upload business logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update business logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete business logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Storage policies for item-images
CREATE POLICY "Anyone can view item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update item images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-images' AND auth.role() = 'authenticated');

-- Add logo_url to businesses
ALTER TABLE public.businesses ADD COLUMN logo_url text DEFAULT '';

-- Add image columns to stock_items (up to 3 images)
ALTER TABLE public.stock_items ADD COLUMN image_url_1 text DEFAULT '';
ALTER TABLE public.stock_items ADD COLUMN image_url_2 text DEFAULT '';
ALTER TABLE public.stock_items ADD COLUMN image_url_3 text DEFAULT '';
