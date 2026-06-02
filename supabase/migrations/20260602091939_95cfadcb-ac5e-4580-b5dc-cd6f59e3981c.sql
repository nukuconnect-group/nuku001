REVOKE EXECUTE ON FUNCTION public.get_my_orders_with_tracking() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_orders_with_tracking() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_orders_with_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders_with_tracking() TO service_role;