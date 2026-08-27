import { supabase } from "@/integrations/supabase/client";

export type CampaignSlot = "connection_note" | "message_1" | "message_2";

export const SLOTS: { slot: CampaignSlot; label: string; hint: string; limit?: number }[] = [
  {
    slot: "connection_note",
    label: "Connection request note",
    hint: "Short, human, no pitch. LinkedIn caps this at 300 characters.",
    limit: 300,
  },
  {
    slot: "message_1",
    label: "Message once they connect",
    hint: "The CCRA first touch — commonality, compliment, reason, ask.",
  },
  {
    slot: "message_2",
    label: "Follow-up message",
    hint: "Tap on the shoulder. Easy yes, easy no.",
  },
];

export type CampaignPurpose = "evergreen" | "event" | "launch" | "reengage";

export const PURPOSES: { value: CampaignPurpose; label: string; hint: string }[] = [
  {
    value: "evergreen",
    label: "Ongoing outreach",
    hint: "Steady conversations with people who fit this offer.",
  },
  {
    value: "event",
    label: "Event or workshop",
    hint: "Invite people to something specific with a date attached.",
  },
  { value: "launch", label: "Launch or new offer", hint: "A window around something new." },
  {
    value: "reengage",
    label: "Re-engage past contacts",
    hint: "People you've spoken to before and want to reopen.",
  },
];

export type ChannelOption = {
  value: string;
  label: string;
  hint: string;
};

export const CHANNELS: ChannelOption[] = [
  { value: "linkedin", label: "LinkedIn", hint: "Connection note, then a message once accepted." },
  { value: "email", label: "Email", hint: "Short subject line, no pitch, one clear ask." },
  { value: "instagram", label: "Instagram DM", hint: "Short, human, phone-length. No paragraphs." },
  { value: "facebook", label: "Facebook DM / Messenger", hint: "Groups and warm circles; keep it casual." },
  { value: "dm", label: "Other DM (X, TikTok, WhatsApp)", hint: "Any direct message channel." },
];

export const WARMTHS = [
  {
    value: "cold",
    label: "Cold — they don't know me",
    hint: "Earn the reply first. Lead with a real, sourced reason you're in their inbox.",
  },
  {
    value: "warm",
    label: "Warm / hot — we've connected before",
    hint: "Pick the thread back up. Reference the actual last touch, not a template.",
  },
];

export function channelLabel(value: string) {
  return CHANNELS.find((c) => c.value === value)?.label ?? "LinkedIn";
}

export function isDm(value: string) {
  return value === "instagram" || value === "facebook" || value === "dm";
}

export type Campaign = {
  id: string;
  brief_id: string | null;
  list_id: string | null;
  name: string;
  channel: string;
  warmth: string;
  status: string;
  purpose: CampaignPurpose;
  event_name: string | null;
  event_date: string | null;
  event_format: string | null;
  event_link: string | null;
  connection_note: string | null;
  message_1: string | null;
  message_2: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignMessage = {
  id: string;
  campaign_id: string;
  prospect_id: string;
  slot: CampaignSlot;
  body: string;
  is_approved: boolean;
};

const CAMPAIGN_COLUMNS =
  "id, brief_id, list_id, name, channel, warmth, status, purpose, event_name, event_date, event_format, event_link, connection_note, message_1, message_2, created_at, updated_at";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function listCampaigns(briefId?: string | null): Promise<Campaign[]> {
  let query = supabase.from("campaigns").select(CAMPAIGN_COLUMNS);
  if (briefId) query = query.eq("brief_id", briefId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Campaign[];
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Campaign;
}

export async function createCampaign(input: {
  name: string;
  listId: string | null;
  briefId: string | null;
  channel: string;
  warmth?: string;
  purpose?: CampaignPurpose;
  eventName?: string | null;
  eventDate?: string | null;
  eventFormat?: string | null;
  eventLink?: string | null;
}): Promise<Campaign> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      name: input.name,
      list_id: input.listId,
      brief_id: input.briefId,
      channel: input.channel,
      warmth: input.warmth ?? "cold",
      purpose: input.purpose ?? "evergreen",
      event_name: input.eventName ?? null,
      event_date: input.eventDate ?? null,
      event_format: input.eventFormat ?? null,
      event_link: input.eventLink ?? null,
    })
    .select(CAMPAIGN_COLUMNS)
    .single();
  if (error) throw error;
  return data as Campaign;
}

export async function updateCampaign(id: string, values: Partial<Campaign>) {
  const { error } = await supabase.from("campaigns").update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteCampaign(id: string) {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}

export async function listCampaignMessages(campaignId: string): Promise<CampaignMessage[]> {
  const { data, error } = await supabase
    .from("campaign_messages")
    .select("id, campaign_id, prospect_id, slot, body, is_approved")
    .eq("campaign_id", campaignId);
  if (error) throw error;
  return (data ?? []) as CampaignMessage[];
}

export async function saveCampaignMessage(input: {
  campaignId: string;
  prospectId: string;
  slot: CampaignSlot;
  body: string;
  isApproved?: boolean;
}) {
  const userId = await currentUserId();
  const { error } = await supabase.from("campaign_messages").upsert(
    {
      user_id: userId,
      campaign_id: input.campaignId,
      prospect_id: input.prospectId,
      slot: input.slot,
      body: input.body,
      is_approved: input.isApproved ?? true,
    },
    { onConflict: "campaign_id,prospect_id,slot" },
  );
  if (error) throw error;
}

/** Personalised body if there is one, otherwise the campaign-level template. */
export function bodyFor(
  campaign: Campaign,
  slot: CampaignSlot,
  personalised: Map<string, string>,
  prospectId: string,
): string {
  const custom = personalised.get(`${prospectId}:${slot}`);
  if (custom && custom.trim()) return custom.trim();
  return (campaign[slot] ?? "").trim();
}
