-- Create business_expenses table
CREATE TABLE public.business_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  recorded_by TEXT NOT NULL DEFAULT '',
  from_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view" ON public.business_expenses
  FOR SELECT TO authenticated
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Members can add" ON public.business_expenses
  FOR INSERT TO authenticated
  WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Members can update" ON public.business_expenses
  FOR UPDATE TO authenticated
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Owner can delete" ON public.business_expenses
  FOR DELETE TO authenticated
  USING (is_owner_or_admin(auth.uid(), business_id));