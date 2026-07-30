
CREATE TABLE public.audit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'open',
  opening_note text NOT NULL DEFAULT '',
  closing_note text NOT NULL DEFAULT '',
  total_expected_cash numeric NOT NULL DEFAULT 0,
  total_counted_cash numeric NOT NULL DEFAULT 0,
  cash_variance_total numeric NOT NULL DEFAULT 0,
  stock_shortfall_value numeric NOT NULL DEFAULT 0,
  net_balance numeric NOT NULL DEFAULT 0,
  profit_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_sessions TO authenticated;
GRANT ALL ON public.audit_sessions TO service_role;
ALTER TABLE public.audit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view audit sessions" ON public.audit_sessions
  FOR SELECT TO authenticated USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner/admin create audit sessions" ON public.audit_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));
CREATE POLICY "Owner/admin update audit sessions" ON public.audit_sessions
  FOR UPDATE TO authenticated USING (public.is_owner_or_admin(auth.uid(), business_id))
  WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));
CREATE POLICY "Owner/admin delete audit sessions" ON public.audit_sessions
  FOR DELETE TO authenticated USING (public.is_owner_or_admin(auth.uid(), business_id));

CREATE UNIQUE INDEX audit_sessions_one_open_per_business
  ON public.audit_sessions (business_id) WHERE status = 'open';

CREATE TABLE public.audit_daily_cash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.audit_sessions(id) ON DELETE SET NULL,
  audit_date date NOT NULL,
  expected_cash numeric NOT NULL DEFAULT 0,
  counted_cash numeric NOT NULL DEFAULT 0,
  variance numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  recorded_by uuid,
  recorded_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, audit_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_daily_cash TO authenticated;
GRANT ALL ON public.audit_daily_cash TO service_role;
ALTER TABLE public.audit_daily_cash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view daily cash" ON public.audit_daily_cash
  FOR SELECT TO authenticated USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner/admin create daily cash" ON public.audit_daily_cash
  FOR INSERT TO authenticated WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));
CREATE POLICY "Owner/admin update daily cash" ON public.audit_daily_cash
  FOR UPDATE TO authenticated USING (public.is_owner_or_admin(auth.uid(), business_id))
  WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));
CREATE POLICY "Owner/admin delete daily cash" ON public.audit_daily_cash
  FOR DELETE TO authenticated USING (public.is_owner_or_admin(auth.uid(), business_id));

CREATE TABLE public.audit_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.audit_sessions(id) ON DELETE CASCADE,
  stock_item_id uuid,
  item_name text NOT NULL DEFAULT '',
  system_qty numeric NOT NULL DEFAULT 0,
  physical_qty numeric NOT NULL DEFAULT 0,
  shortfall_qty numeric NOT NULL DEFAULT 0,
  unit_value numeric NOT NULL DEFAULT 0,
  price_basis text NOT NULL DEFAULT 'wholesale',
  shortfall_value numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, stock_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_stock_counts TO authenticated;
GRANT ALL ON public.audit_stock_counts TO service_role;
ALTER TABLE public.audit_stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view stock counts" ON public.audit_stock_counts
  FOR SELECT TO authenticated USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "Owner/admin create stock counts" ON public.audit_stock_counts
  FOR INSERT TO authenticated WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));
CREATE POLICY "Owner/admin update stock counts" ON public.audit_stock_counts
  FOR UPDATE TO authenticated USING (public.is_owner_or_admin(auth.uid(), business_id))
  WITH CHECK (public.is_owner_or_admin(auth.uid(), business_id));
CREATE POLICY "Owner/admin delete stock counts" ON public.audit_stock_counts
  FOR DELETE TO authenticated USING (public.is_owner_or_admin(auth.uid(), business_id));

CREATE TRIGGER audit_sessions_updated_at BEFORE UPDATE ON public.audit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_daily_cash_updated_at BEFORE UPDATE ON public.audit_daily_cash
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER audit_stock_counts_updated_at BEFORE UPDATE ON public.audit_stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
