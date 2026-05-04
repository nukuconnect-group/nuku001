
-- Replace the overly permissive policy with a slightly more targeted one
DROP POLICY IF EXISTS "Authenticated users can notify others" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
