-- 1. Product boosts: add admin management + user delete policies
CREATE POLICY "Admins can view all boosts"
ON public.product_boosts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update boosts"
ON public.product_boosts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete boosts"
ON public.product_boosts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own boosts"
ON public.product_boosts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 2. Formation modules: restrict paid content
DROP POLICY IF EXISTS "Authenticated can view modules" ON public.formation_modules;

CREATE POLICY "Users can view free formation modules"
ON public.formation_modules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.formations f
    WHERE f.id = formation_modules.formation_id
    AND (f.is_paid = false OR f.is_paid IS NULL)
  )
);

CREATE POLICY "Enrolled users can view paid formation modules"
ON public.formation_modules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.formations f
    WHERE f.id = formation_modules.formation_id
    AND f.is_paid = true
  )
  AND EXISTS (
    SELECT 1 FROM public.formation_progress fp
    WHERE fp.formation_id = formation_modules.formation_id
    AND fp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all modules"
ON public.formation_modules FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));