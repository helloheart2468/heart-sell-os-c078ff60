import { supabase } from "@/integrations/supabase/client";
import type { CampaignSlot } from "@/lib/campaigns";
import type { Prospect } from "@/lib/prospects";

export type TouchKind = "sent" | "reply" | "call_booked" | "note";

export type Touch = {
  id: string;
  prospect_id: string;
  thread_id: string | null;
  kind: TouchKind;
  channel: string | null;
  sequence_step: number | null;
  campaign_id: string | null;
  campaign_slot: string | null;
  outcome: string | null;
  body_excerpt: string | null;
  occurred_at: string;
};

export type FollowUpState = "new" | "active" | "waiting" | "booked" | "closed";

export type ReplyOutcome = "interested" | "not_now" | "not_interested" | "chatting";

const TOUCH_COLUMNS =
  "id, prospect_id, thread_id, kind, channel, sequence_step, campaign_id, campaign_slot, outcome, body_excerpt, occurred_at";

/** The 7-Day Sales Path cadence: Message 1 → +3 days, Message 2 → +3 days, Message 3 → closeout. */
export const SEQUENCE = [
  { step: 1, label: "Message 1 · CCRA first touch", waitDays: 3 },
  { step: 2, label: "Message 2 · Tap on the shoulder", waitDays: 3 },
  { step: 3, label: "Message 3 · Easy yes, easy no", waitDays: 0 },
] as const;

export function stepLabel(step: number | null | undefined): string {
  const found = SEQUENCE.find((entry) => entry.step === step);
  return found ? found.label : "Follow up";
}

export function nextStepLabel(prospect: Prospect): string {
  return stepLabel(Math.min((prospect.sequence_step ?? 0) + 1, 3));
}

/** Which campaign step a given sequence number maps to. */
export function slotForStep(step: number): CampaignSlot {
  if (step <= 1) return "connection_note";
  if (step === 2) return "message_1";
  return "message_2";
}

/**
 * Every touch is stamped with the campaign it belongs to. If the prospect isn't
 * linked yet we look up the campaign that wraps their list, so replies and booked
 * calls trace back without anyone tagging them by hand.
 */
export async function resolveCampaignId(prospect: Prospect): Promise<string | null> {
  if (prospect.campaign_id) return prospect.campaign_id;
  if (!prospect.list_id) return null;
  const { data } = await supabase
    .from("campaigns")
    .select("id")
    .eq("list_id", prospect.list_id)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.id ?? null;
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

async function logTouch(input: {
  prospectId: string;
  briefId?: string | null;
  threadId?: string | null;
  kind: TouchKind;
  channel?: string | null;
  sequenceStep?: number | null;
  campaignId?: string | null;
  campaignSlot?: CampaignSlot | null;
  outcome?: string | null;
  bodyExcerpt?: string | null;
  occurredAt?: string;
}) {
  const userId = await currentUserId();
  const { error } = await supabase.from("touches").insert({
    user_id: userId,
    prospect_id: input.prospectId,
    brief_id: input.briefId ?? null,
    thread_id: input.threadId ?? null,
    kind: input.kind,
    channel: input.channel ?? null,
    sequence_step: input.sequenceStep ?? null,
    campaign_id: input.campaignId ?? null,
    campaign_slot: input.campaignSlot ?? null,
    outcome: input.outcome ?? null,
    body_excerpt: input.bodyExcerpt ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw error;
}

async function patchProspect(id: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from("prospects")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function listTouches(prospectId: string): Promise<Touch[]> {
  const { data, error } = await supabase
    .from("touches")
    .select(TOUCH_COLUMNS)
    .eq("prospect_id", prospectId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Touch[];
}

/** One tap: they sent the next message. Advances the cadence automatically. */
export async function logSent(prospect: Prospect, channel?: string, campaignId?: string | null) {
  const step = Math.min((prospect.sequence_step ?? 0) + 1, 3);
  const wait = SEQUENCE.find((entry) => entry.step === step)?.waitDays ?? 0;
  const campaign = campaignId ?? (await resolveCampaignId(prospect));
  const slot = slotForStep(step);
  await logTouch({
    prospectId: prospect.id,
    briefId: prospect.brief_id,
    kind: "sent",
    channel: channel ?? null,
    sequenceStep: step,
    campaignId: campaign,
    campaignSlot: slot,
  });
  const done = step >= 3;
  await patchProspect(prospect.id, {
    status: "contacted",
    campaign_id: campaign,
    campaign_slot: slot,
    sequence_step: step,
    last_touch_at: new Date().toISOString(),
    follow_up_state: done ? "waiting" : "active",
    next_action_at: done ? null : addDays(wait),
    next_action_kind: done ? null : `message_${step + 1}`,
  });
}

export async function logReply(prospect: Prospect, outcome: ReplyOutcome, campaignId?: string | null) {
  const campaign = campaignId ?? (await resolveCampaignId(prospect));
  const slot = slotForStep(Math.max(prospect.sequence_step ?? 1, 1));
  await logTouch({
    prospectId: prospect.id,
    briefId: prospect.brief_id,
    kind: "reply",
    outcome,
    campaignId: campaign,
    campaignSlot: slot,
  });
  const base = {
    last_touch_at: new Date().toISOString(),
    status: "replied",
    campaign_id: campaign,
    campaign_slot: slot,
  };
  if (outcome === "interested") {
    await patchProspect(prospect.id, {
      ...base,
      follow_up_state: "active",
      next_action_at: addDays(1),
      next_action_kind: "book_call",
    });
    return;
  }
  if (outcome === "not_now") {
    await patchProspect(prospect.id, {
      ...base,
      follow_up_state: "waiting",
      next_action_at: addDays(30),
      next_action_kind: "gentle_recheck",
    });
    return;
  }
  if (outcome === "not_interested") {
    await patchProspect(prospect.id, {
      ...base,
      status: "closed",
      follow_up_state: "closed",
      next_action_at: null,
      next_action_kind: null,
    });
    return;
  }
  await patchProspect(prospect.id, {
    ...base,
    follow_up_state: "active",
    next_action_at: addDays(3),
    next_action_kind: "keep_talking",
  });
}

export async function logCallBooked(
  prospect: Prospect,
  callAtISO: string,
  campaignId?: string | null,
) {
  const campaign = campaignId ?? (await resolveCampaignId(prospect));
  const slot = slotForStep(Math.max(prospect.sequence_step ?? 1, 1));
  await logTouch({
    prospectId: prospect.id,
    briefId: prospect.brief_id,
    kind: "call_booked",
    outcome: callAtISO,
    campaignId: campaign,
    campaignSlot: slot,
  });
  const prepAt = new Date(callAtISO);
  prepAt.setDate(prepAt.getDate() - 1);
  await patchProspect(prospect.id, {
    status: "call_booked",
    campaign_id: campaign,
    campaign_slot: slot,
    follow_up_state: "booked",
    call_at: callAtISO,
    last_touch_at: new Date().toISOString(),
    next_action_at: prepAt.toISOString(),
    next_action_kind: "prep_call",
  });
}

export async function snoozeFollowUp(prospect: Prospect, days: number) {
  await patchProspect(prospect.id, { next_action_at: addDays(days) });
}

export async function closeFollowUp(prospect: Prospect) {
  await logTouch({ prospectId: prospect.id, briefId: prospect.brief_id, kind: "note", outcome: "closed" });
  await patchProspect(prospect.id, {
    follow_up_state: "closed",
    next_action_at: null,
    next_action_kind: null,
  });
}

export async function reopenFollowUp(prospect: Prospect) {
  await patchProspect(prospect.id, {
    follow_up_state: "active",
    next_action_at: new Date().toISOString(),
    next_action_kind: `message_${Math.min((prospect.sequence_step ?? 0) + 1, 3)}`,
  });
}

export type Bucket = "overdue" | "today" | "week" | "waiting" | "booked";

export function bucketFor(prospect: Prospect): Bucket | null {
  if (prospect.follow_up_state === "closed") return null;
  if (prospect.follow_up_state === "booked") return "booked";
  if (!prospect.next_action_at) {
    return prospect.follow_up_state === "waiting" ? "waiting" : null;
  }
  const due = new Date(prospect.next_action_at).getTime();
  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (due < now && due < endOfToday.getTime() - 86_400_000) return "overdue";
  if (due <= endOfToday.getTime()) return due < now ? "today" : "today";
  if (due <= endOfToday.getTime() + 6 * 86_400_000) return "week";
  return "waiting";
}

export const BUCKET_LABELS: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  waiting: "Waiting on a reply",
  booked: "Calls booked",
};

/** Everything the nudge engine and the Follow-ups page share. */
export function dueNow(prospects: Prospect[]): Prospect[] {
  return prospects.filter((prospect) => {
    const bucket = bucketFor(prospect);
    return bucket === "overdue" || bucket === "today" || bucket === "booked";
  });
}

export function formatDue(value: string | null): string {
  if (!value) return "no date set";
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
