
-- Fix order_items: allow members to delete items (needed for updateOrder to replace items)
CREATE POLICY "Members can delete order items"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND is_business_member(auth.uid(), o.business_id)
  )
);

-- Add soft-delete to stock_items
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create receipts table for permanent receipt storage
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  receipt_type text NOT NULL DEFAULT 'sale', -- 'sale', 'order', 'service', 'purchase'
  transaction_id text NOT NULL, -- references the sale/order/service id
  buyer_name text NOT NULL DEFAULT '',
  seller_name text NOT NULL DEFAULT '',
  grand_total numeric NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]',
  business_info jsonb,
  code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view receipts"
ON public.receipts
FOR SELECT
USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Members can create receipts"
ON public.receipts
FOR INSERT
WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Owner can delete receipts"
ON public.receipts
FOR DELETE
USING (is_owner_or_admin(auth.uid(), business_id));

-- Add seller_name to sales table for tracking who sold
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';

-- Add seller_name to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS seller_name text NOT NULL DEFAULT '';

-- Add notifications table for owners
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'new_order', 'new_purchase', 'low_stock'
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notifications"
ON public.notifications
FOR SELECT
USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Members can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Members can update notifications"
ON public.notifications
FOR UPDATE
USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Owner can delete notifications"
ON public.notifications
FOR DELETE
USING (is_owner_or_admin(auth.uid(), business_id));
