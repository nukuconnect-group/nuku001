CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created_desc ON public.notifications (user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_user_type_created_desc ON public.profiles (user_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles (is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_profiles_business_name_lower ON public.profiles (lower(business_name)) WHERE business_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_lower ON public.profiles (lower(full_name)) WHERE full_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_created_desc ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_moderation_created_desc ON public.products (moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_producer_created_desc ON public.products (producer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON public.products (lower(name)) WHERE name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_seller_created_desc ON public.orders (seller_id, created_at DESC);