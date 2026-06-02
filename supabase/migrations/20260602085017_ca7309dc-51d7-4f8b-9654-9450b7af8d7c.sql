REVOKE EXECUTE ON FUNCTION public.confirm_seller_order(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_orders() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_seller_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_orders() TO authenticated;