
-- Order disputes/complaints table
CREATE TABLE public.order_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reporter_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  dispute_type text NOT NULL DEFAULT 'missing',
  description text NOT NULL DEFAULT '',
  photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  supplier_response text NOT NULL DEFAULT '',
  resolution text NOT NULL DEFAULT ''
);

ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

-- Reporter can create disputes
CREATE POLICY "Reporter can create disputes" ON public.order_disputes
  FOR INSERT TO authenticated
  WITH CHECK (reporter_business_id IN (
    SELECT bm.business_id FROM public.business_memberships bm WHERE bm.user_id = auth.uid()
  ));

-- Members of either business can view
CREATE POLICY "Business members can view disputes" ON public.order_disputes
  FOR SELECT TO authenticated
  USING (
    is_business_member(auth.uid(), business_id) OR
    is_business_member(auth.uid(), reporter_business_id)
  );

-- Members of supplier business can update (respond)
CREATE POLICY "Supplier can respond to disputes" ON public.order_disputes
  FOR UPDATE TO authenticated
  USING (is_business_member(auth.uid(), business_id) OR is_business_member(auth.uid(), reporter_business_id));

-- Owner/admin can delete
CREATE POLICY "Owner can delete disputes" ON public.order_disputes
  FOR DELETE TO authenticated
  USING (is_owner_or_admin(auth.uid(), business_id) OR is_owner_or_admin(auth.uid(), reporter_business_id));

-- Add deleted_at column to orders for soft delete / recycle bin
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add cancelled_reason to orders for bargain/cancel tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_reason text NOT NULL DEFAULT '';
