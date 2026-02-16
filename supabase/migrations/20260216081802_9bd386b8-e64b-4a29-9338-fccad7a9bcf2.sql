-- Drop and recreate the SELECT policy to also allow owners
DROP POLICY "Members can view business" ON public.businesses;
CREATE POLICY "Members can view business" ON public.businesses
  FOR SELECT USING (is_business_member(auth.uid(), id) OR auth.uid() = owner_id);