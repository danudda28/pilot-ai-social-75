CREATE TABLE public.content_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title text NOT NULL, goal text, start_date date NOT NULL, end_date date NOT NULL,
  posts_per_week int NOT NULL DEFAULT 3, plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL, kind text NOT NULL DEFAULT 'promotie', offer text, goal text,
  start_date date, end_date date, status text NOT NULL DEFAULT 'activa', created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['content_strategies','campaigns'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE INDEX ON public.%I (brand_id)', t);
    EXECUTE format('CREATE TRIGGER set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand()', t);
    EXECUTE format('CREATE POLICY "org read" ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "org insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_org_role(public.brand_org(brand_id), ARRAY[''owner'',''admin'',''marketer'']::public.org_role[]))', t);
    EXECUTE format('CREATE POLICY "org update" ON public.%I FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY[''owner'',''admin'',''marketer'']::public.org_role[]))', t);
    EXECUTE format('CREATE POLICY "org delete" ON public.%I FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY[''owner'',''admin'',''marketer'']::public.org_role[]))', t);
  END LOOP;
END $$;

ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.content_strategies(id) ON DELETE SET NULL;

CREATE TABLE public.publishing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.generated_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, brand_id uuid, organization_id uuid,
  connection_id uuid REFERENCES public.meta_connections(id) ON DELETE SET NULL,
  target text NOT NULL, kind text NOT NULL CHECK (kind IN ('fb','ig')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','published','failed','cancelled')),
  attempts int NOT NULL DEFAULT 0, max_attempts int NOT NULL DEFAULT 3,
  run_at timestamptz NOT NULL DEFAULT now(), next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text, external_id text, published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, target)
);
CREATE INDEX ON public.publishing_jobs (status, next_attempt_at);
CREATE INDEX ON public.publishing_jobs (user_id);
GRANT SELECT ON public.publishing_jobs TO authenticated;
GRANT ALL ON public.publishing_jobs TO service_role;
ALTER TABLE public.publishing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or org read jobs" ON public.publishing_jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND public.is_org_member(organization_id)));

CREATE OR REPLACE FUNCTION public.set_job_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL THEN
    NEW.organization_id := (SELECT organization_id FROM brands WHERE id = NEW.brand_id);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_job_org() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER set_org BEFORE INSERT OR UPDATE ON public.publishing_jobs FOR EACH ROW EXECUTE FUNCTION public.set_job_org();

CREATE TABLE public.social_connection_health (
  connection_id uuid PRIMARY KEY REFERENCES public.meta_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token_valid boolean, expires_at timestamptz, scopes text[] NOT NULL DEFAULT '{}',
  missing_scopes text[] NOT NULL DEFAULT '{}', instagram_linked boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz, last_success_at timestamptz, last_failure_at timestamptz, last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_connection_health TO authenticated;
GRANT ALL ON public.social_connection_health TO service_role;
ALTER TABLE public.social_connection_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health read" ON public.social_connection_health FOR SELECT TO authenticated USING (user_id = auth.uid());