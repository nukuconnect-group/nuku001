-- Revoke EXECUTE from anon on admin-only functions
REVOKE EXECUTE ON FUNCTION public.admin_set_user_subscription(uuid, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_subscription(uuid, text, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_email_confirmations(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_recent_actions(integer, timestamptz, timestamptz, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_tokens(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_user_subscription(uuid, text, integer, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enroll_paid_formation(uuid, uuid) FROM anon;

-- Revoke from anon on functions requiring auth
REVOKE EXECUTE ON FUNCTION public.spend_user_tokens(uuid, integer, text, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_token_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_free_plan_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_token_purchase(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_token_purchase(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renew_free_subscription() FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_delivery_otp(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_delivery_otp(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resubmit_product_moderation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_conversation_messages(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_conversation_thread(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_seo_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_seo_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_user_products(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_route_performance_stats(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_api_call(uuid, uuid, text, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_formation_document(uuid) FROM anon;

-- Revoke admin functions from authenticated too (defense in depth, internal has_role check exists)
REVOKE EXECUTE ON FUNCTION public.admin_delete_user_data(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_credit_tokens(uuid, integer, text) FROM authenticated;

-- Trigger functions: revoke from anon (called by triggers not users)
REVOKE EXECUTE ON FUNCTION public.notify_delivery_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_international_stage_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_order_confirmed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_seller_confirmation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_buyer_seller_validation_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_referral_earning_on_order() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_referral_earning_on_subscription() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_delivery_share_token() FROM anon;