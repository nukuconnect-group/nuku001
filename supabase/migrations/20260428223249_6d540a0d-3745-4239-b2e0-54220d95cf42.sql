
-- Supprimer la policy de lecture redondante sur blog_comments
-- (la policy "Anyone can view blog comments" couvre déjà le cas authenticated)
DROP POLICY IF EXISTS "Authenticated users can view blog comments" ON public.blog_comments;
