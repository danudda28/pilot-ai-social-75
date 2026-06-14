
-- 1. email_log: add restrictive policies to block direct writes from authenticated users
CREATE POLICY "no direct insert email log" ON public.email_log
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no direct update email log" ON public.email_log
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no direct delete email log" ON public.email_log
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- 2. Storage: add UPDATE policy for post-images
CREATE POLICY "users can update own post images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. brand_invitations: allow invited authenticated user to read their pending invitation by email
CREATE POLICY "invited user can read own invitation" ON public.brand_invitations
  FOR SELECT TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- 4. Revoke EXECUTE on internal RLS helpers from PUBLIC/authenticated/anon — they should only run inside policies (SECURITY DEFINER still works there)
REVOKE EXECUTE ON FUNCTION public.has_brand_role(uuid, uuid, brand_role[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_quotas() FROM PUBLIC, anon, authenticated;
