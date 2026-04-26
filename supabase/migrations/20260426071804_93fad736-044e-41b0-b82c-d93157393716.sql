-- Create a ledger table to record every debt repayment so we can compute
-- "today's repaid debts" (cash collected today on transactions created previously).
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('sale','service','order','purchase')),
  source_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  recorded_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_business_created ON public.debt_payments(business_id, created_at DESC);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view debt payments"
ON public.debt_payments FOR SELECT
USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Members can add debt payments"
ON public.debt_payments FOR INSERT
WITH CHECK (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Owner/admin can delete debt payments"
ON public.debt_payments FOR DELETE
USING (public.is_owner_or_admin(auth.uid(), business_id));