-- Add soft-delete columns to all transactional tables that don't have them yet

-- sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- purchases
ALTER TABLE public.purchases 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- orders (already has deleted_at)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- services
ALTER TABLE public.services 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- business_expenses
ALTER TABLE public.business_expenses 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- factory_expenses
ALTER TABLE public.factory_expenses 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- factory_production
ALTER TABLE public.factory_production 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- property_bookings
ALTER TABLE public.property_bookings 
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- factory_raw_materials (already has deleted_at)
ALTER TABLE public.factory_raw_materials 
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- property_assets (already has deleted_at)
ALTER TABLE public.property_assets 
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT '';

-- Indexes for recycle-bin queries
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON public.sales(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchases_deleted_at ON public.purchases(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_deleted_at ON public.services(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_expenses_deleted_at ON public.business_expenses(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_factory_expenses_deleted_at ON public.factory_expenses(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_factory_production_deleted_at ON public.factory_production(business_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_bookings_deleted_at ON public.property_bookings(business_id, deleted_at) WHERE deleted_at IS NOT NULL;