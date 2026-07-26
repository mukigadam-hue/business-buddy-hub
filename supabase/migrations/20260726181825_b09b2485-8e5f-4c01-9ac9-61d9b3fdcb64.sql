
-- 1. business_customers INSERT: require user_id = auth.uid()
DROP POLICY IF EXISTS "Owner/admin can add customers" ON public.business_customers;
CREATE POLICY "Members can add own customer records"
  ON public.business_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_business_member(auth.uid(), business_id)
    AND user_id = auth.uid()
  );

-- 2. order_disputes UPDATE: split reporter vs supplier and restrict columns via trigger
DROP POLICY IF EXISTS "Supplier can respond to disputes" ON public.order_disputes;

CREATE POLICY "Supplier can respond to disputes"
  ON public.order_disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Reporter can edit own dispute details"
  ON public.order_disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_business_member(auth.uid(), reporter_business_id))
  WITH CHECK (public.is_business_member(auth.uid(), reporter_business_id));

-- Column-level enforcement: reporter (non-supplier) cannot change supplier-only fields;
-- supplier (non-reporter) cannot change reporter-only fields.
CREATE OR REPLACE FUNCTION public.enforce_order_dispute_field_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_supplier boolean := public.is_business_member(auth.uid(), NEW.business_id);
  is_reporter boolean := public.is_business_member(auth.uid(), NEW.reporter_business_id);
BEGIN
  -- Reporter-only actor cannot change supplier response/resolution/status
  IF is_reporter AND NOT is_supplier THEN
    IF NEW.supplier_response IS DISTINCT FROM OLD.supplier_response
       OR NEW.resolution IS DISTINCT FROM OLD.resolution
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at THEN
      RAISE EXCEPTION 'Reporter cannot modify supplier response, resolution, status, or resolved_at';
    END IF;
  END IF;

  -- Supplier-only actor cannot change reporter-authored fields
  IF is_supplier AND NOT is_reporter THEN
    IF NEW.description IS DISTINCT FROM OLD.description
       OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
       OR NEW.dispute_type IS DISTINCT FROM OLD.dispute_type THEN
      RAISE EXCEPTION 'Supplier cannot modify reporter-authored fields';
    END IF;
  END IF;

  -- Neither party (should never reach here due to RLS) is rejected outright
  IF NOT is_supplier AND NOT is_reporter THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_dispute_field_scope ON public.order_disputes;
CREATE TRIGGER enforce_order_dispute_field_scope
  BEFORE UPDATE ON public.order_disputes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_dispute_field_scope();
