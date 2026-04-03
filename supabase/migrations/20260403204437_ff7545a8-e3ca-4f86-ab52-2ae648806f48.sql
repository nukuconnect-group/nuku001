
-- Create follows table
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can view follows"
ON public.follows FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
TO authenticated
WITH CHECK (follower_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE
TO authenticated
USING (follower_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Admin delete user data function
CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: only admins can delete user data';
  END IF;

  -- Delete user's products
  DELETE FROM public.products WHERE producer_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  
  -- Delete user's orders (as buyer)
  DELETE FROM public.orders WHERE buyer_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  
  -- Delete user's demands
  DELETE FROM public.demands WHERE user_id = p_user_id;
  
  -- Delete user's notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  
  -- Delete user's follows
  DELETE FROM public.follows WHERE follower_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id)
    OR following_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  
  -- Delete user's wishlist
  DELETE FROM public.wishlist WHERE user_id = p_user_id;
  
  -- Delete user's subscriptions
  DELETE FROM public.subscriptions WHERE user_id = p_user_id;
  
  -- Delete user's reviews
  DELETE FROM public.reviews WHERE user_id = p_user_id;
  
  -- Delete driver profile
  DELETE FROM public.driver_profiles WHERE user_id = p_user_id;
  
  -- Delete delivery addresses
  DELETE FROM public.delivery_addresses WHERE user_id = p_user_id;
  
  -- Delete profile private
  DELETE FROM public.profile_private WHERE user_id = p_user_id;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Delete user presence
  DELETE FROM public.user_presence WHERE user_id = p_user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$$;
