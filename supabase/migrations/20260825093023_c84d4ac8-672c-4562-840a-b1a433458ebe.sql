REVOKE EXECUTE ON FUNCTION public.record_business_visit(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_business_visitors(uuid, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_business_visit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_visitors(uuid, integer) TO authenticated;