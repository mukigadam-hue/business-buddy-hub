
CREATE TABLE public.business_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'mobile_money',
  provider_name text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payment methods"
  ON public.business_payment_methods FOR SELECT TO public
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Owner/admin can add payment methods"
  ON public.business_payment_methods FOR INSERT TO public
  WITH CHECK (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Owner/admin can update payment methods"
  ON public.business_payment_methods FOR UPDATE TO public
  USING (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Owner/admin can delete payment methods"
  ON public.business_payment_methods FOR DELETE TO public
  USING (is_owner_or_admin(auth.uid(), business_id));

-- Allow authenticated users to view payment methods of any business (for buyers/renters)
CREATE POLICY "Authenticated can view any business payment methods"
  ON public.business_payment_methods FOR SELECT TO authenticated
  USING (is_active = true);
