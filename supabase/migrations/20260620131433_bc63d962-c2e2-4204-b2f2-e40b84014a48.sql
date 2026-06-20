DROP POLICY IF EXISTS "Anyone can view blog comments" ON public.blog_comments;
CREATE POLICY "Authenticated users can view blog comments"
ON public.blog_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view likes" ON public.blog_comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON public.blog_comment_likes FOR SELECT TO authenticated USING (true);