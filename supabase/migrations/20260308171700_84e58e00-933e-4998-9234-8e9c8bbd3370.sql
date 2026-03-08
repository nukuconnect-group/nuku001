
-- Create admin role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: Only admins can view user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create admin-only views for dashboard data
-- Function to get all stats for admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_producers', (SELECT count(*) FROM public.profiles WHERE user_type = 'producer'),
    'total_buyers', (SELECT count(*) FROM public.profiles WHERE user_type = 'buyer'),
    'total_products', (SELECT count(*) FROM public.products),
    'total_orders', (SELECT count(*) FROM public.orders),
    'total_revenue', (SELECT COALESCE(sum(total_price), 0) FROM public.orders),
    'pending_orders', (SELECT count(*) FROM public.orders WHERE status = 'pending'),
    'completed_orders', (SELECT count(*) FROM public.orders WHERE status = 'completed'),
    'total_subscriptions', (SELECT count(*) FROM public.subscriptions),
    'pro_subscriptions', (SELECT count(*) FROM public.subscriptions WHERE plan = 'pro' AND status = 'active'),
    'free_subscriptions', (SELECT count(*) FROM public.subscriptions WHERE plan = 'free' AND status = 'active'),
    'total_conversations', (SELECT count(*) FROM public.conversations),
    'total_demands', (SELECT count(*) FROM public.demands WHERE status = 'active'),
    'total_reviews', (SELECT count(*) FROM public.reviews)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get all users for admin
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT json_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'full_name', p.full_name,
    'user_type', p.user_type,
    'phone', p.phone,
    'location', p.location,
    'is_verified', p.is_verified,
    'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'products_count', (SELECT count(*) FROM public.products WHERE producer_id = p.id),
    'orders_count', (SELECT count(*) FROM public.orders WHERE buyer_id = p.id OR seller_id = p.id),
    'subscription', (SELECT json_build_object('plan', s.plan, 'status', s.status, 'max_products', s.max_products) FROM public.subscriptions s WHERE s.user_id = p.user_id LIMIT 1)
  )
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to get all orders for admin
CREATE OR REPLACE FUNCTION public.get_admin_orders()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT json_build_object(
    'id', o.id,
    'status', o.status,
    'total_price', o.total_price,
    'quantity', o.quantity,
    'created_at', o.created_at,
    'product_name', pr.name,
    'product_category', pr.category,
    'buyer_name', bp.full_name,
    'seller_name', sp.full_name
  )
  FROM public.orders o
  LEFT JOIN public.products pr ON pr.id = o.product_id
  LEFT JOIN public.profiles bp ON bp.id = o.buyer_id
  LEFT JOIN public.profiles sp ON sp.id = o.seller_id
  ORDER BY o.created_at DESC;
END;
$$;

-- Function to get subscriptions for admin
CREATE OR REPLACE FUNCTION public.get_admin_subscriptions()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT json_build_object(
    'id', s.id,
    'plan', s.plan,
    'status', s.status,
    'billing_period', s.billing_period,
    'max_products', s.max_products,
    'started_at', s.started_at,
    'expires_at', s.expires_at,
    'user_name', p.full_name,
    'user_type', p.user_type,
    'user_phone', p.phone
  )
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  ORDER BY s.created_at DESC;
END;
$$;
