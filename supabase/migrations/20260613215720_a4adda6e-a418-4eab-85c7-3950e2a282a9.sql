
-- ============ ENUM pentru roluri ============
DO $$ BEGIN
  CREATE TYPE public.brand_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ BRANDS ============
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  business_type TEXT,
  domain TEXT,
  default_tone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.brand_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.brand_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_members TO authenticated;
GRANT ALL ON public.brand_members TO service_role;
ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.brand_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.brand_role NOT NULL DEFAULT 'editor',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_invitations TO authenticated;
GRANT ALL ON public.brand_invitations TO service_role;
ALTER TABLE public.brand_invitations ENABLE ROW LEVEL SECURITY;

-- ============ Security definer helpers (evită recursie RLS) ============
CREATE OR REPLACE FUNCTION public.is_brand_member(_brand_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.brand_members WHERE brand_id = _brand_id AND user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.brands WHERE id = _brand_id AND owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_brand_role(_brand_id UUID, _user_id UUID, _roles public.brand_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brands WHERE id = _brand_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.brand_members WHERE brand_id = _brand_id AND user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- ============ RLS brands ============
CREATE POLICY "members read brands" ON public.brands FOR SELECT TO authenticated
  USING (public.is_brand_member(id, auth.uid()));
CREATE POLICY "authenticated create brand" ON public.brands FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner update brand" ON public.brands FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner delete brand" ON public.brands FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "members read brand members" ON public.brand_members FOR SELECT TO authenticated
  USING (public.is_brand_member(brand_id, auth.uid()));
CREATE POLICY "owner manage members" ON public.brand_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id AND owner_id = auth.uid()));

CREATE POLICY "owner read invitations" ON public.brand_invitations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id AND owner_id = auth.uid()));
CREATE POLICY "owner create invitations" ON public.brand_invitations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id AND owner_id = auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "owner delete invitations" ON public.brand_invitations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands WHERE id = brand_id AND owner_id = auth.uid()));

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  rewarded BOOLEAN NOT NULL DEFAULT false,
  reward_amount INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.referrals FOR ALL TO authenticated
  USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);

-- ============ TESTIMONIALS ============
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_role TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  avatar_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published testimonials" ON public.testimonials FOR SELECT
  USING (published = true OR auth.uid() = created_by);
CREATE POLICY "creator manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- ============ NOTIFICATION PREFERENCES ============
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on_publish_success BOOLEAN NOT NULL DEFAULT true,
  notify_on_publish_failure BOOLEAN NOT NULL DEFAULT true,
  notify_on_quota_reset BOOLEAN NOT NULL DEFAULT true,
  notify_weekly_summary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif prefs" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EMAIL LOG (simplu, fără queue) ============
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own email log" ON public.email_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============ ALTER existing tables ============
ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS variant_group UUID,
  ADD COLUMN IF NOT EXISTS variant_label TEXT,
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_likes INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_comments INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_shares INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_reach INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_fetched_at TIMESTAMPTZ;

ALTER TABLE public.meta_connections
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_access_token TEXT,
  ADD COLUMN IF NOT EXISTS user_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;

ALTER TABLE public.users_profiles
  ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + INTERVAL '1 month'),
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- generate referral codes for existing users
UPDATE public.users_profiles SET referral_code = upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 8)) WHERE referral_code IS NULL;

-- ============ Auto-create brand on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_brand_id UUID;
  ref_code TEXT;
BEGIN
  ref_code := upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 8));
  INSERT INTO public.users_profiles (user_id, full_name, referral_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), ref_code)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.brands (owner_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'Brandul meu'))
  RETURNING id INTO new_brand_id;

  INSERT INTO public.brand_members (brand_id, user_id, role) VALUES (new_brand_id, NEW.id, 'owner');
  UPDATE public.users_profiles SET current_brand_id = new_brand_id WHERE user_id = NEW.id;

  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill brands pentru useri existenți
DO $$
DECLARE
  u RECORD;
  new_brand_id UUID;
BEGIN
  FOR u IN SELECT user_id FROM public.users_profiles WHERE current_brand_id IS NULL LOOP
    INSERT INTO public.brands (owner_id, name) VALUES (u.user_id, 'Brandul meu') RETURNING id INTO new_brand_id;
    INSERT INTO public.brand_members (brand_id, user_id, role) VALUES (new_brand_id, u.user_id, 'owner') ON CONFLICT DO NOTHING;
    UPDATE public.users_profiles SET current_brand_id = new_brand_id WHERE user_id = u.user_id;
    UPDATE public.generated_posts SET brand_id = new_brand_id WHERE user_id = u.user_id AND brand_id IS NULL;
    UPDATE public.meta_connections SET brand_id = new_brand_id WHERE user_id = u.user_id AND brand_id IS NULL;
    INSERT INTO public.notification_preferences (user_id) VALUES (u.user_id) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============ Update RLS pe generated_posts (brand-aware) ============
DROP POLICY IF EXISTS "own posts" ON public.generated_posts;
CREATE POLICY "brand members read posts" ON public.generated_posts FOR SELECT TO authenticated
  USING (brand_id IS NULL AND auth.uid() = user_id OR public.is_brand_member(brand_id, auth.uid()));
CREATE POLICY "editors insert posts" ON public.generated_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (brand_id IS NULL OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner','editor']::public.brand_role[])));
CREATE POLICY "editors update posts" ON public.generated_posts FOR UPDATE TO authenticated
  USING (brand_id IS NULL AND auth.uid() = user_id OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner','editor']::public.brand_role[]));
CREATE POLICY "editors delete posts" ON public.generated_posts FOR DELETE TO authenticated
  USING (brand_id IS NULL AND auth.uid() = user_id OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner','editor']::public.brand_role[]));

DROP POLICY IF EXISTS "own meta connections" ON public.meta_connections;
CREATE POLICY "brand members read meta" ON public.meta_connections FOR SELECT TO authenticated
  USING (brand_id IS NULL AND auth.uid() = user_id OR public.is_brand_member(brand_id, auth.uid()));
CREATE POLICY "owners manage meta" ON public.meta_connections FOR ALL TO authenticated
  USING (brand_id IS NULL AND auth.uid() = user_id OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner']::public.brand_role[]))
  WITH CHECK (auth.uid() = user_id AND (brand_id IS NULL OR public.has_brand_role(brand_id, auth.uid(), ARRAY['owner']::public.brand_role[])));

-- ============ Quota reset function ============
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reset_count INTEGER := 0;
BEGIN
  WITH updated AS (
    UPDATE public.users_profiles
    SET posts_remaining = CASE subscription_plan
      WHEN 'basic' THEN 10
      WHEN 'pro' THEN 50
      WHEN 'business' THEN 999
      ELSE 3
    END,
    quota_reset_at = date_trunc('month', now()) + INTERVAL '1 month'
    WHERE quota_reset_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO reset_count FROM updated;
  RETURN reset_count;
END;
$$;

-- ============ Updated_at trigger pentru brands/notification_prefs ============
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
