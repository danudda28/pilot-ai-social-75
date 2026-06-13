
REVOKE EXECUTE ON FUNCTION public.is_brand_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_brand_role(UUID, UUID, public.brand_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_quotas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_quotas() TO service_role;

-- Add explicit parens to satisfy linter on combined brand_id checks
DROP POLICY IF EXISTS "brand members read posts" ON public.generated_posts;
DROP POLICY IF EXISTS "editors insert posts" ON public.generated_posts;
DROP POLICY IF EXISTS "editors update posts" ON public.generated_posts;
DROP POLICY IF EXISTS "editors delete posts" ON public.generated_posts;
CREATE POLICY "brand members read posts" ON public.generated_posts FOR SELECT TO authenticated
  USING ((brand_id IS NULL AND auth.uid() = user_id) OR (brand_id IS NOT NULL AND public.is_brand_member(brand_id, auth.uid())));
CREATE POLICY "editors insert posts" ON public.generated_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (brand_id IS NULL OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner','editor']::public.brand_role[])));
CREATE POLICY "editors update posts" ON public.generated_posts FOR UPDATE TO authenticated
  USING ((brand_id IS NULL AND auth.uid() = user_id) OR (brand_id IS NOT NULL AND public.has_brand_role(brand_id, auth.uid(), ARRAY['owner','editor']::public.brand_role[])));
CREATE POLICY "editors delete posts" ON public.generated_posts FOR DELETE TO authenticated
  USING ((brand_id IS NULL AND auth.uid() = user_id) OR (brand_id IS NOT NULL AND public.has_brand_role(brand_id, auth.uid(), ARRAY['owner','editor']::public.brand_role[])));

DROP POLICY IF EXISTS "brand members read meta" ON public.meta_connections;
DROP POLICY IF EXISTS "owners manage meta" ON public.meta_connections;
CREATE POLICY "brand members read meta" ON public.meta_connections FOR SELECT TO authenticated
  USING ((brand_id IS NULL AND auth.uid() = user_id) OR (brand_id IS NOT NULL AND public.is_brand_member(brand_id, auth.uid())));
CREATE POLICY "owners manage meta" ON public.meta_connections FOR ALL TO authenticated
  USING ((brand_id IS NULL AND auth.uid() = user_id) OR (brand_id IS NOT NULL AND public.has_brand_role(brand_id, auth.uid(), ARRAY['owner']::public.brand_role[])))
  WITH CHECK (auth.uid() = user_id AND (brand_id IS NULL OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner']::public.brand_role[])));
