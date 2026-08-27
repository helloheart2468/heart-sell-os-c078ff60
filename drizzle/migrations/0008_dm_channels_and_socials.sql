ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS socials jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS warmth text NOT NULL DEFAULT 'cold';