-- Business core: one row per user
CREATE TABLE public.business_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_summary text,
  problems_solved text,
  unfair_advantage text,
  story_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profile TO authenticated;
GRANT ALL ON public.business_profile TO service_role;

ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own business profile" ON public.business_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER business_profile_set_updated_at
  BEFORE UPDATE ON public.business_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Offers live on audience_briefs
ALTER TABLE public.audience_briefs
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Sticky default offer
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL;

-- Stamp work with its offer
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL;
ALTER TABLE public.prospect_lists
  ADD COLUMN IF NOT EXISTS brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL;
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS brief_id uuid REFERENCES public.audience_briefs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS threads_user_brief_idx ON public.threads (user_id, brief_id);
CREATE INDEX IF NOT EXISTS prospect_lists_user_brief_idx ON public.prospect_lists (user_id, brief_id);
CREATE INDEX IF NOT EXISTS prospects_user_brief_idx ON public.prospects (user_id, brief_id);

-- Backfill: business core from each user's newest brief
INSERT INTO public.business_profile (user_id, business_summary, problems_solved, unfair_advantage, story_notes)
SELECT DISTINCT ON (b.user_id)
  b.user_id, b.business_summary, b.problems_solved, b.unfair_advantage, b.story_notes
FROM public.audience_briefs b
ORDER BY b.user_id, b.is_active DESC, b.updated_at DESC
ON CONFLICT (user_id) DO NOTHING;

-- Backfill: current offer per user
UPDATE public.profiles p
SET current_brief_id = sub.id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.audience_briefs
  ORDER BY user_id, is_active DESC, updated_at DESC
) sub
WHERE p.id = sub.user_id AND p.current_brief_id IS NULL;

-- Backfill: stamp existing work with that offer
UPDATE public.threads t
SET brief_id = p.current_brief_id
FROM public.profiles p
WHERE t.user_id = p.id AND t.brief_id IS NULL AND p.current_brief_id IS NOT NULL;

UPDATE public.prospect_lists l
SET brief_id = p.current_brief_id
FROM public.profiles p
WHERE l.user_id = p.id AND l.brief_id IS NULL AND p.current_brief_id IS NOT NULL;

UPDATE public.prospects pr
SET brief_id = p.current_brief_id
FROM public.profiles p
WHERE pr.user_id = p.id AND pr.brief_id IS NULL AND p.current_brief_id IS NOT NULL;

-- Business-core columns now live on business_profile only
UPDATE public.audience_briefs
SET business_summary = NULL,
    problems_solved = NULL,
    unfair_advantage = NULL,
    story_notes = NULL;