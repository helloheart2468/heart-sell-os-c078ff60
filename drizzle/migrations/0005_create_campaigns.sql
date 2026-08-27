CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL,
  list_id uuid REFERENCES public.prospect_lists(id) ON DELETE SET NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'linkedin',
  status text NOT NULL DEFAULT 'draft',
  connection_note text,
  message_1 text,
  message_2 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER campaigns_updated
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX campaigns_user_idx ON public.campaigns (user_id, created_at DESC);

CREATE TABLE public.campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  slot text NOT NULL,
  body text NOT NULL DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, prospect_id, slot)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_messages TO authenticated;
GRANT ALL ON public.campaign_messages TO service_role;

ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own campaign messages" ON public.campaign_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER campaign_messages_updated
  BEFORE UPDATE ON public.campaign_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX campaign_messages_campaign_idx ON public.campaign_messages (campaign_id, prospect_id);