import type { UIMessage } from "ai";

import { supabase } from "@/integrations/supabase/client";
import { AGENTS, type AgentId } from "@/lib/heart-sell";

export type ThreadRow = {
  id: string;
  agent: string;
  mode: string;
  title: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  role: string;
  parts: unknown;
  created_at: string;
};

export async function listThreads(): Promise<ThreadRow[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, agent, mode, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ThreadRow[];
}

export async function getThread(threadId: string): Promise<ThreadRow | null> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, agent, mode, title, updated_at")
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
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("threads")
    .insert({
      user_id: userId,
      agent,
      mode,
      title: title?.slice(0, 90) || `${AGENTS[agent].name} · ${mode === "structured" ? AGENTS[agent].structuredTitle : "conversation"}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function renameThread(threadId: string, title: string) {
  const { error } = await supabase
    .from("threads")
    .update({ title: title.slice(0, 90) })
    .eq("id", threadId);
  if (error) throw error;
}

export async function deleteThread(threadId: string) {
  const { error } = await supabase.from("threads").delete().eq("id", threadId);
  if (error) throw error;
}

export type BriefRecord = Record<string, string> & { id?: string };

export async function getActiveBrief(): Promise<BriefRecord | null> {
  const { data, error } = await supabase
    .from("audience_briefs")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as BriefRecord) ?? null;
}

export async function saveBrief(values: Record<string, string>, existingId?: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  if (existingId) {
    const { error } = await supabase
      .from("audience_briefs")
      .update({ ...values, is_active: true })
      .eq("id", existingId);
    if (error) throw error;
    return existingId;
  }

  const { data, error } = await supabase
    .from("audience_briefs")
    .insert({ ...values, user_id: userId, is_active: true })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}
