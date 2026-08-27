import type { UIMessage } from "ai";

import { supabase } from "@/integrations/supabase/client";
import { AGENTS, type AgentId } from "@/lib/heart-sell";

export type ThreadRow = {
  id: string;
  agent: string;
  mode: string;
  title: string;
  updated_at: string;
  brief_id: string | null;
  is_pinned: boolean;
  is_archived: boolean;
};

export type MessageRow = {
  id: string;
  role: string;
  parts: unknown;
  created_at: string;
};

const THREAD_COLUMNS =
  "id, agent, mode, title, updated_at, brief_id, is_pinned, is_archived";

export async function listThreads(): Promise<ThreadRow[]> {
  const { data, error } = await supabase
    .from("threads")
    .select(THREAD_COLUMNS)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ThreadRow[];
}

export async function getThread(threadId: string): Promise<ThreadRow | null> {
  const { data, error } = await supabase
    .from("threads")
    .select(THREAD_COLUMNS)
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  return (data as ThreadRow) ?? null;
}

export async function getThreadMessages(threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, parts, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    parts: (Array.isArray(row.parts) ? row.parts : []) as UIMessage["parts"],
  }));
}

export async function createThread(
  agent: AgentId,
  mode: "chat" | "structured",
  title?: string,
  briefId?: string | null,
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const resolvedBriefId = briefId === undefined ? await getCurrentBriefId() : briefId;

  const { data, error } = await supabase
    .from("threads")
    .insert({
      user_id: userId,
      agent,
      mode,
      brief_id: resolvedBriefId,
      title: title?.slice(0, 90) || `${AGENTS[agent].name} · ${mode === "structured" ? AGENTS[agent].structuredTitle : "conversation"}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function setThreadBrief(threadId: string, briefId: string | null) {
  const { error } = await supabase
    .from("threads")
    .update({ brief_id: briefId })
    .eq("id", threadId);
  if (error) throw error;
}

export async function renameThread(threadId: string, title: string) {
  const { error } = await supabase
    .from("threads")
    .update({ title: title.slice(0, 90) })
    .eq("id", threadId);
  if (error) throw error;
}

export async function setThreadPinned(threadId: string, pinned: boolean) {
  const { error } = await supabase
    .from("threads")
    .update({ is_pinned: pinned })
    .eq("id", threadId);
  if (error) throw error;
}

export async function setThreadArchived(threadId: string, archived: boolean) {
  const { error } = await supabase
    .from("threads")
    .update({ is_archived: archived })
    .eq("id", threadId);
  if (error) throw error;
}

export async function deleteThread(threadId: string) {
  const { error } = await supabase.from("threads").delete().eq("id", threadId);
  if (error) throw error;
}

/* ---------------------------------- offers --------------------------------- */

export type BriefRecord = Record<string, string> & { id: string; name: string };

export type BusinessCore = {
  id?: string;
  business_summary?: string | null;
  problems_solved?: string | null;
  unfair_advantage?: string | null;
  story_notes?: string | null;
  greeting?: string | null;
  sign_off?: string | null;
  booking_link?: string | null;
  communication_style?: string | null;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function getBusinessCore(): Promise<BusinessCore | null> {
  const { data, error } = await supabase
    .from("business_profile")
    .select(
      "id, business_summary, problems_solved, unfair_advantage, story_notes, greeting, sign_off, booking_link, communication_style",
    )
    .maybeSingle();
  if (error) throw error;
  return (data as BusinessCore) ?? null;
}

export async function saveBusinessCore(values: Record<string, string>) {
  const userId = await currentUserId();
  const existing = await getBusinessCore();
  if (existing?.id) {
    const { error } = await supabase
      .from("business_profile")
      .update(values as Record<string, never>)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from("business_profile")
    .insert({ ...(values as Record<string, never>), user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listBriefs(includeArchived = false): Promise<BriefRecord[]> {
  let query = supabase.from("audience_briefs").select("*");
  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BriefRecord[];
}

export async function getBrief(briefId: string): Promise<BriefRecord | null> {
  const { data, error } = await supabase
    .from("audience_briefs")
    .select("*")
    .eq("id", briefId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BriefRecord) ?? null;
}

export async function getCurrentBriefId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("current_brief_id")
    .maybeSingle();
  if (error) throw error;
  const id = (data as { current_brief_id: string | null } | null)?.current_brief_id ?? null;
  if (id) return id;
  const offers = await listBriefs();
  return offers[0]?.id ?? null;
}

export async function setCurrentBriefId(briefId: string | null) {
  const userId = await currentUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ current_brief_id: briefId })
    .eq("id", userId);
  if (error) throw error;
}

export async function createBrief(
  values: Record<string, string> = {},
  options: { makeCurrent?: boolean } = {},
): Promise<string> {
  const userId = await currentUserId();
  const existing = await listBriefs(true);
  const { data, error } = await supabase
    .from("audience_briefs")
    .insert({
      ...values,
      name: values["name"]?.trim() || `Offer ${existing.length + 1}`,
      user_id: userId,
      sort_order: existing.length,
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = data.id as string;
  if (options.makeCurrent !== false) await setCurrentBriefId(id);
  return id;
}

export async function duplicateBrief(briefId: string): Promise<string> {
  const source = await getBrief(briefId);
  if (!source) throw new Error("Offer not found.");
  const { id: _id, user_id: _userId, created_at: _c, updated_at: _u, ...rest } =
    source as unknown as Record<string, string>;
  return createBrief(
    { ...(rest as Record<string, string>), name: `${source.name} (copy)` },
    { makeCurrent: false },
  );
}

export async function updateBrief(briefId: string, values: Record<string, string>) {
  const { error } = await supabase
    .from("audience_briefs")
    .update({ ...values, is_active: true })
    .eq("id", briefId);
  if (error) throw error;
  return briefId;
}

export async function archiveBrief(briefId: string, archived = true) {
  const { error } = await supabase
    .from("audience_briefs")
    .update({ is_archived: archived })
    .eq("id", briefId);
  if (error) throw error;
}

export async function deleteBrief(briefId: string) {
  const { error } = await supabase.from("audience_briefs").delete().eq("id", briefId);
  if (error) throw error;
}

/** Save an offer brief — updates when an id is given, otherwise creates one. */
export async function saveBrief(values: Record<string, string>, existingId?: string) {
  if (existingId) return updateBrief(existingId, values);
  return createBrief(values);
}

