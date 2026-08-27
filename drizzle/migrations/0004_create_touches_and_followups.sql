CREATE TABLE public.touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL,
  thread_id uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'sent',
  channel text,
  sequence_step integer,
  outcome text,
  body_excerpt text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.touches TO authenticated;
GRANT ALL ON public.touches TO service_role;

ALTER TABLE public.touches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own touches" ON public.touches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX touches_prospect_idx ON public.touches (prospect_id, occurred_at DESC);

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS follow_up_state text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS sequence_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_kind text,
  ADD COLUMN IF NOT EXISTS call_at timestamptz;

CREATE INDEX IF NOT EXISTS prospects_next_action_idx
  ON public.prospects (user_id, next_action_at)
  WHERE next_action_at IS NOT NULL;