
-- Remove sensitive/financial tables from realtime publication
-- Keep notifications, property_messages, video_requests, orders as they need realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.businesses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.business_expenses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.factory_expenses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.factory_worker_payments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.factory_worker_advances;
