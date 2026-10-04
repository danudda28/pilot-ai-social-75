CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  customer_name text, customer_id text, channel text,
  intent text NOT NULL DEFAULT 'interes general',
  summary text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','won','lost')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.leads (brand_id);
CREATE INDEX ON public.leads (status);
CREATE TRIGGER set_org BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand();
CREATE POLICY "org read" ON public.leads FOR SELECT TO authenticated USING (public.is_org_member(organization_id));
CREATE POLICY "org responders insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.has_org_role(public.brand_org(brand_id), ARRAY['owner','admin','marketer','agent']::public.org_role[]));
CREATE POLICY "org responders update" ON public.leads FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY['owner','admin','marketer','agent']::public.org_role[]));
CREATE POLICY "org editors delete" ON public.leads FOR DELETE TO authenticated USING (public.has_org_role(organization_id, ARRAY['owner','admin','marketer']::public.org_role[]));

ALTER TABLE public.agent_settings
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_send_min_confidence numeric NOT NULL DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS auto_send_daily_limit int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS auto_send_intents text[] NOT NULL DEFAULT ARRAY['program','locație','contact','servicii'];

CREATE TABLE public.auto_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  draft_id uuid REFERENCES public.ai_reply_drafts(id) ON DELETE SET NULL,
  body text NOT NULL, confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auto_send_log TO authenticated;
GRANT ALL ON public.auto_send_log TO service_role;
ALTER TABLE public.auto_send_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.auto_send_log (brand_id, created_at);
CREATE TRIGGER set_org BEFORE INSERT OR UPDATE ON public.auto_send_log FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand();
CREATE POLICY "org read" ON public.auto_send_log FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

ALTER TABLE public.ai_reply_drafts ADD COLUMN IF NOT EXISTS auto_sent boolean NOT NULL DEFAULT false;