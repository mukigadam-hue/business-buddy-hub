
-- Add business_type to businesses
ALTER TABLE public.businesses ADD COLUMN business_type text NOT NULL DEFAULT 'business';

-- Factory raw materials (input stock)
CREATE TABLE public.factory_raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  unit_type text NOT NULL DEFAULT 'pieces',
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  min_stock_level numeric NOT NULL DEFAULT 5,
  supplier text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Factory expenses (non-production)
CREATE TABLE public.factory_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  recorded_by text NOT NULL DEFAULT '',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Factory team members (with ranks and salaries)
CREATE TABLE public.factory_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  rank text NOT NULL DEFAULT 'worker',
  salary numeric NOT NULL DEFAULT 0,
  phone text NOT NULL DEFAULT '',
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Factory production records
CREATE TABLE public.factory_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  product_stock_id uuid REFERENCES public.stock_items(id),
  quantity_produced integer NOT NULL DEFAULT 0,
  materials_used jsonb NOT NULL DEFAULT '[]',
  waste_quantity numeric NOT NULL DEFAULT 0,
  waste_unit text NOT NULL DEFAULT 'pieces',
  production_date date NOT NULL,
  expiry_date date,
  recorded_by text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.factory_raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_production ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view" ON public.factory_raw_materials FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add" ON public.factory_raw_materials FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update" ON public.factory_raw_materials FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete" ON public.factory_raw_materials FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Members can view" ON public.factory_expenses FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add" ON public.factory_expenses FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update" ON public.factory_expenses FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete" ON public.factory_expenses FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Members can view" ON public.factory_team_members FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add" ON public.factory_team_members FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update" ON public.factory_team_members FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete" ON public.factory_team_members FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

CREATE POLICY "Members can view" ON public.factory_production FOR SELECT USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can add" ON public.factory_production FOR INSERT WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "Members can update" ON public.factory_production FOR UPDATE USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner can delete" ON public.factory_production FOR DELETE USING (is_owner_or_admin(auth.uid(), business_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_raw_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_production;

CREATE TRIGGER update_factory_raw_materials_updated_at
  BEFORE UPDATE ON public.factory_raw_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
