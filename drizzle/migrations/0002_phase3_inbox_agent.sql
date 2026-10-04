CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'meta', object text, dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL, signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.meta_connections(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('messenger','instagram','fb_comment','ig_comment')),
  external_id text NOT NULL, customer_id text, customer_name text, post_external_id text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','human','closed')),
  ai_paused boolean NOT NULL DEFAULT false, unread int NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(), last_inbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')), body text NOT NULL DEFAULT '',
  external_id text UNIQUE, author_name text, sent_by uuid, hidden boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_reply_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  body text NOT NULL, sources jsonb NOT NULL DEFAULT '[]'::jsonb, confidence numeric,
  handoff_suggested boolean NOT NULL DEFAULT false, reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sent')),
  edited_text text, decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL, brand_id uuid NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true, mode text NOT NULL DEFAULT 'draft' CHECK (mode IN ('draft')),
  working_hours jsonb NOT NULL DEFAULT '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}'::jsonb,
  forbidden_topics text[] NOT NULL DEFAULT ARRAY['prețuri neconfirmate','reclamații','sfaturi medicale','sfaturi juridice'],
  handoff_keywords text[] NOT NULL DEFAULT ARRAY['rambursare','avocat','reclamație','ANPC','nemulțumit'],
  handoff_message text NOT NULL DEFAULT 'Mulțumim pentru mesaj! Un coleg îți răspunde personal cât de curând.',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['conversations','messages','ai_reply_drafts','agent_settings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE INDEX ON public.%I (brand_id)', t);
    EXECUTE format('CREATE TRIGGER set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_org_from_brand()', t);
    EXECUTE format('CREATE POLICY "org read" ON public.%I FOR SELECT TO authenticated USING (public.is_org_member(organization_id))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['conversations','messages','ai_reply_drafts'] LOOP
    EXECUTE format('CREATE POLICY "org responders update" ON public.%I FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY[''owner'',''admin'',''marketer'',''agent'']::public.org_role[]))', t);
  END LOOP;
END $$;
CREATE POLICY "org editors insert" ON public.agent_settings FOR INSERT TO authenticated WITH CHECK (public.has_org_role(public.brand_org(brand_id), ARRAY['owner','admin','marketer']::public.org_role[]));
CREATE POLICY "org editors update" ON public.agent_settings FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, ARRAY['owner','admin','marketer']::public.org_role[]));
CREATE INDEX ON public.conversations (brand_id, last_message_at DESC);
CREATE INDEX ON public.messages (conversation_id, sent_at);
CREATE INDEX ON public.ai_reply_drafts (conversation_id, status);