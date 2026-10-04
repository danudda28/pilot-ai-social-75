
CREATE TYPE public.org_role AS ENUM ('owner','admin','marketer','agent','viewer');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  plan text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
  automation_paused boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members WHERE organization_id = _org AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.has_org_role(_org uuid, _roles public.org_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_members WHERE organization_id = _org AND user_id = auth.uid() AND role = ANY(_roles))
$$;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, public.org_role[]) TO authenticated, service_role;

CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "admins update org" ON public.organizations FOR UPDATE TO authenticated USING (public.has_org_role(id, ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "members read members" ON public.organization_members FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "admins insert members" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) AND role <> 'owner');
CREATE POLICY "admins update members" ON public.organization_members FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) AND role <> 'owner') WITH CHECK (role <> 'owner');
CREATE POLICY "admins delete members" ON public.organization_members FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]) AND role <> 'owner');

-- brands extension
ALTER TABLE public.brands
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN legal_name text, ADD COLUMN short_description text, ADD COLUMN long_description text,
  ADD COLUMN category text, ADD COLUMN subcategory text, ADD COLUMN target_audience text,
  ADD COLUMN differentiators text, ADD COLUMN brand_values text,
  ADD COLUMN languages text[] NOT NULL DEFAULT ARRAY['ro'],
  ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/Bucharest',
  ADD COLUMN currency text NOT NULL DEFAULT 'RON',
  ADD COLUMN website_url text, ADD COLUMN primary_goal text, ADD COLUMN city text,
  ADD COLUMN country text DEFAULT 'România', ADD COLUMN phone text, ADD COLUMN email text,
  ADD COLUMN whatsapp text, ADD COLUMN booking_url text,
  ADD COLUMN onboarding_step int NOT NULL DEFAULT 0,
  ADD COLUMN onboarding_completed_at timestamptz,
  ADD COLUMN deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.brand_org(_brand uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM brands WHERE id = _brand
$$;
REVOKE EXECUTE ON FUNCTION public.brand_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.brand_org(uuid) TO authenticated, service_role;

CREATE POLICY "org members read brands" ON public.brands FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_org_member(organization_id));
CREATE POLICY "org editors update brands" ON public.brands FOR UPDATE TO authenticated USING (organization_id IS NOT NULL AND public.has_org_role(organization_id, ARRAY['owner','admin','marketer']::public.org_role[]));

-- Backfill organizations
DO $$
DECLARE u RECORD; new_org uuid; prof RECORD;
BEGIN
  FOR u IN SELECT DISTINCT owner_id FROM public.brands WHERE organization_id IS NULL LOOP
    SELECT company_name, full_name INTO prof FROM public.users_profiles WHERE user_id = u.owner_id;
    INSERT INTO public.organizations (name, created_by)
      VALUES (COALESCE(NULLIF(prof.company_name,''), NULLIF(prof.full_name,''), 'Organizația mea'), u.owner_id)
      RETURNING id INTO new_org;
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (new_org, u.owner_id, 'owner');
    UPDATE public.brands SET organization_id = new_org WHERE owner_id = u.owner_id AND organization_id IS NULL;
  END LOOP;
  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT b.organization_id, bm.user_id,
    CASE bm.role WHEN 'owner' THEN 'owner'::public.org_role WHEN 'editor' THEN 'marketer'::public.org_role ELSE 'viewer'::public.org_role END
  FROM public.brand_members bm JOIN public.brands b ON b.id = bm.brand_id
  ON CONFLICT (organization_id, user_id) DO NOTHING;
END $$;

-- new users: org + brand
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_brand_id uuid; new_org uuid; ref_code text;
BEGIN
  ref_code := upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 8));
  INSERT INTO public.users_profiles (user_id, full_name, referral_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), ref_code)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.organizations (name, created_by)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name',''), 'Organizația mea'), NEW.id)
  RETURNING id INTO new_org;
  INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (new_org, NEW.id, 'owner');
  INSERT INTO public.brands (owner_id, name, organization_id)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name',''), 'Brandul meu'), new_org)
  RETURNING id INTO new_brand_id;
  INSERT INTO public.brand_members (brand_id, user_id, role) VALUES (new_brand_id, NEW.id, 'owner');
  UPDATE public.users_profiles SET current_brand_id = new_brand_id WHERE user_id = NEW.id;
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- generic brand-scoped tables
CREATE OR REPLACE FUNCTION public.set_org_from_brand()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM brands WHERE id = NEW.brand_id);
  IF NEW.organization_id IS NULL THEN RAISE EXCEPTION 'Brand fără organizație'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TABLE public.brand_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL, address text, city text, country text DEFAULT 'România',
  phone text, email text, opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  service_area text, booking_url text, maps_url text, is_primary boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.brand_voice_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  tone text NOT NULL DEFAULT 'prietenos', address_form text NOT NULL DEFAULT 'tu',
  emoji_level text NOT NULL DEFAULT 'putine', text_length text NOT NULL DEFAULT 'mediu',
  preferred_phrases text[] NOT NULL DEFAULT '{}', banned_words text[] NOT NULL DEFAULT '{}',
  example_posts text[] NOT NULL DEFAULT '{}', example_replies text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}', fonts text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL, description text, price_type text NOT NULL DEFAULT 'unknown',
  price_from numeric, price_to numeric, currency text NOT NULL DEFAULT 'RON', duration text, url text,
  confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.business_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'altele', title text NOT NULL, content text NOT NULL,
  confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.brand_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  question text NOT NULL, answer text NOT NULL, confirmed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'manual', title text NOT NULL, url text, content text,
  status text NOT NULL DEFAULT 'draft', created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.business_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  url text NOT NULL, status text NOT NULL DEFAULT 'pending', pages_scanned int NOT NULL DEFAULT 0,
  result jsonb, error text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brand_locations','brand_voice_rules','products_services','business_policies','brand_faqs','knowledge_sources','business_scans'] LOOP
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

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid, actor_id uuid, action text NOT NULL, entity text NOT NULL, entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_org_role(organization_id, ARRAY['owner','admin']::public.org_role[]));
CREATE INDEX ON public.audit_logs (organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_brand_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF TG_TABLE_NAME = 'brands' THEN org := r.organization_id; ELSE org := r.organization_id; END IF;
  IF org IS NULL THEN RETURN r; END IF;
  INSERT INTO audit_logs (organization_id, brand_id, actor_id, action, entity, entity_id)
  VALUES (org, CASE WHEN TG_TABLE_NAME IN ('brands','organization_members') THEN NULL ELSE (to_jsonb(r)->>'brand_id')::uuid END,
          auth.uid(), lower(TG_OP), TG_TABLE_NAME, r.id);
  RETURN r;
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brands','organization_members','brand_locations','brand_voice_rules','products_services','business_policies','brand_faqs','knowledge_sources'] LOOP
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_brand_change()', t, t);
  END LOOP;
END $$;
