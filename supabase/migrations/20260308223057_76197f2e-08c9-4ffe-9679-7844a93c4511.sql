
-- Subscriptions table to track premium plans
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view subscription"
  ON public.subscriptions FOR SELECT
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Owner can manage subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Owner can update subscription"
  ON public.subscriptions FOR UPDATE
  USING (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Owner can delete subscription"
  ON public.subscriptions FOR DELETE
  USING (is_owner_or_admin(auth.uid(), business_id));

-- Helper function to check if a business has an active premium subscription
CREATE OR REPLACE FUNCTION public.is_premium(_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE business_id = _business_id
      AND plan = 'premium'
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
