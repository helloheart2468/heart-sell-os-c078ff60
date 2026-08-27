ALTER TABLE public.touches ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.touches ADD COLUMN IF NOT EXISTS campaign_slot TEXT;

ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS campaign_slot TEXT;

CREATE INDEX IF NOT EXISTS touches_campaign_idx ON public.touches (user_id, campaign_id);
CREATE INDEX IF NOT EXISTS prospects_campaign_idx ON public.prospects (user_id, campaign_id);

-- Backfill: attach existing prospects to the campaign that wraps their list, when unambiguous.
UPDATE public.prospects p
SET campaign_id = c.id
FROM public.campaigns c
WHERE p.campaign_id IS NULL
  AND p.list_id IS NOT NULL
  AND c.list_id = p.list_id
  AND c.user_id = p.user_id;
