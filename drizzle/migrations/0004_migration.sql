-- Faza 5: monitorizare, costuri AI, webhooks CRM, indexuri de scalare

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id uuid,
  feature text NOT NULL,
  model text NOT NULL,
  tokens_in integer DEFAULT 0,
  tokens_out integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read ai usage" ON public.ai_usage_log FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id));

CREATE TABLE IF NOT EXISTS public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  source text NOT NULL,
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read errors" ON public.error_log FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(organization_id));

CREATE TABLE IF NOT EXISTS public.brand_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['lead.created'],
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_webhooks TO authenticated;
GRANT ALL ON public.brand_webhooks TO service_role;
ALTER TABLE public.brand_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read webhooks" ON public.brand_webhooks FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));
CREATE POLICY "org editors manage webhooks" ON public.brand_webhooks FOR ALL TO authenticated
  USING (public.has_org_role(organization_id, ARRAY['owner','admin','marketer']::public.org_role[]))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['owner','admin','marketer']::public.org_role[]));

CREATE TRIGGER set_org_brand_webhooks BEFORE INSERT ON public.brand_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand();
CREATE TRIGGER set_org_ai_usage BEFORE INSERT ON public.ai_usage_log
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand();
CREATE TRIGGER set_org_error_log BEFORE INSERT ON public.error_log
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand();

CREATE INDEX IF NOT EXISTS idx_pub_jobs_due ON public.publishing_jobs (status, next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pub_jobs_post ON public.publishing_jobs (post_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages (conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_conv ON public.ai_reply_drafts (conversation_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_brand ON public.leads (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_brand_day ON public.ai_usage_log (brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_error_log_created ON public.error_log (created_at DESC);