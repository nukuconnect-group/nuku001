
-- 1. Restrict blog_comments SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view comments" ON public.blog_comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.blog_comments;
DROP POLICY IF EXISTS "Blog comments are publicly readable" ON public.blog_comments;

CREATE POLICY "Authenticated users can view blog comments"
ON public.blog_comments
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow suppliers to update their own KYC submission while still pending
CREATE POLICY "Suppliers can update own pending kyc"
ON public.supplier_kyc_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');
