CREATE TABLE public.prospect_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  audience text NOT NULL DEFAULT 'Ideal Clients',
  temperature text NOT NULL DEFAULT 'Cold',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_lists TO authenticated;
GRANT ALL ON public.prospect_lists TO service_role;
ALTER TABLE public.prospect_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own lists select" ON public.prospect_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own lists insert" ON public.prospect_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists update" ON public.prospect_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists delete" ON public.prospect_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.prospect_lists(id) ON DELETE SET NULL,
  name text NOT NULL,
  title text,
  company text,
  blurb text,
  location text,
  linkedin_url text,
  social_url text,
  website text,
  email text,
  audience text NOT NULL DEFAULT 'Ideal Clients',
  temperature text NOT NULL DEFAULT 'Cold',
  status text NOT NULL DEFAULT 'saved',
  why_fits text,
  notes text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prospects_user_idx ON public.prospects(user_id);
CREATE INDEX prospects_list_idx ON public.prospects(list_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prospects select" ON public.prospects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prospects insert" ON public.prospects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prospects update" ON public.prospects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prospects delete" ON public.prospects FOR DELETE TO authenticated USING (auth.uid() = user_id);