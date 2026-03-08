-- Add payment configuration to workers
ALTER TABLE public.factory_team_members 
ADD COLUMN IF NOT EXISTS payment_frequency TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS next_payment_due DATE DEFAULT CURRENT_DATE;

-- Create worker payments table
CREATE TABLE public.factory_worker_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.factory_team_members(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  advance_deducted NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create worker advances table
CREATE TABLE public.factory_worker_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.factory_team_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  date_given DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.factory_worker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_worker_advances ENABLE ROW LEVEL SECURITY;

-- RLS for payments
CREATE POLICY "Members can view payments" ON public.factory_worker_payments
  FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add payments" ON public.factory_worker_payments
  FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update payments" ON public.factory_worker_payments
  FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete payments" ON public.factory_worker_payments
  FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

-- RLS for advances
CREATE POLICY "Members can view advances" ON public.factory_worker_advances
  FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add advances" ON public.factory_worker_advances
  FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update advances" ON public.factory_worker_advances
  FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete advances" ON public.factory_worker_advances
  FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));