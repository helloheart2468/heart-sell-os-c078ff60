ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'evergreen',
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_format text,
  ADD COLUMN IF NOT EXISTS event_link text;

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'scout',
  ADD COLUMN IF NOT EXISTS enrichment_state text NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS public.playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'My Heart Sell Playbook',
  goal jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playbooks TO authenticated;
GRANT ALL ON public.playbooks TO service_role;

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own playbooks" ON public.playbooks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER playbooks_set_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS playbooks_user_idx ON public.playbooks(user_id, updated_at DESC);