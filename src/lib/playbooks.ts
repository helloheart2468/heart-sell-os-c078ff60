import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type PlaybookGoal = {
  who_sells: string;
  focus: string;
  outcome: string;
  capacity: string;
  team_notes?: string;
  event_name?: string;
  event_date?: string;
};

export type PlaybookSection = { heading: string; body: string };

export type Playbook = {
  id: string;
  brief_id: string | null;
  title: string;
  goal: PlaybookGoal;
  sections: PlaybookSection[];
  status: string;
  created_at: string;
  updated_at: string;
};

export const WHO_SELLS_OPTIONS = [
  "Just me",
  "Me plus a VA or assistant",
  "A sales team",
] as const;

export const FOCUS_OPTIONS = [
  "This offer, day to day",
  "An event or workshop",
  "Strategic partnerships",
  "Ecosystem growth",
] as const;

export const CAPACITY_OPTIONS = [
  "A couple of hours a week",
  "Half a day a week",
  "A few hours most days",
  "Full-time selling",
] as const;

const COLUMNS = "id, brief_id, title, goal, sections, status, created_at, updated_at";

function toPlaybook(row: Record<string, unknown>): Playbook {
  return {
    id: row["id"] as string,
    brief_id: (row["brief_id"] as string | null) ?? null,
    title: (row["title"] as string) ?? "My Heart Sell Playbook",
    goal: (row["goal"] as PlaybookGoal) ?? ({} as PlaybookGoal),
    sections: Array.isArray(row["sections"]) ? (row["sections"] as PlaybookSection[]) : [],
    status: (row["status"] as string) ?? "draft",
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
  };
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function listPlaybooks(briefId?: string | null): Promise<Playbook[]> {
  let query = supabase.from("playbooks").select(COLUMNS);
  if (briefId) query = query.eq("brief_id", briefId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toPlaybook(row as Record<string, unknown>));
}

export async function getPlaybook(id: string): Promise<Playbook | null> {
  const { data, error } = await supabase.from("playbooks").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toPlaybook(data as Record<string, unknown>) : null;
}

export async function savePlaybook(input: {
  id?: string;
  briefId?: string | null;
  title: string;
  goal: PlaybookGoal;
  sections: PlaybookSection[];
}): Promise<Playbook> {
  const userId = await currentUserId();
  const payload = {
    user_id: userId,
    brief_id: input.briefId ?? null,
    title: input.title,
    goal: input.goal as unknown as Json,
    sections: input.sections as unknown as Json,
    status: "ready",
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? supabase.from("playbooks").update(payload).eq("id", input.id).select(COLUMNS).single()
    : supabase.from("playbooks").insert(payload).select(COLUMNS).single();
  const { data, error } = await query;
  if (error) throw error;
  return toPlaybook(data as Record<string, unknown>);
}

export async function deletePlaybook(id: string) {
  const { error } = await supabase.from("playbooks").delete().eq("id", id);
  if (error) throw error;
}
