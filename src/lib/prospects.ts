import { supabase } from "@/integrations/supabase/client";

export type ProspectList = {
  id: string;
  brief_id: string | null;
  name: string;
  audience: string;
  temperature: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Prospect = {
  id: string;
  brief_id: string | null;
  list_id: string | null;
  name: string;
  title: string | null;
  company: string | null;
  blurb: string | null;
  location: string | null;
  linkedin_url: string | null;
  social_url: string | null;
  website: string | null;
  email: string | null;
  audience: string;
  temperature: string;
  status: string;
  why_fits: string | null;
  notes: string | null;
  created_at: string;
};

export type NewProspect = {
  name: string;
  title?: string;
  company?: string;
  blurb?: string;
  location?: string;
  linkedin_url?: string;
  social_url?: string;
  website?: string;
  email?: string;
  why_fits?: string;
  audience?: string;
  temperature?: string;
};

const PROSPECT_COLUMNS =
  "id, brief_id, list_id, name, title, company, blurb, location, linkedin_url, social_url, website, email, audience, temperature, status, why_fits, notes, created_at";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function listProspectLists(briefId?: string | null): Promise<ProspectList[]> {
  let query = supabase
    .from("prospect_lists")
    .select("id, brief_id, name, audience, temperature, notes, created_at, updated_at");
  if (briefId) query = query.eq("brief_id", briefId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProspectList[];
}

export async function listProspects(
  listId?: string,
  briefId?: string | null,
): Promise<Prospect[]> {
  let query = supabase.from("prospects").select(PROSPECT_COLUMNS);
  if (listId) query = query.eq("list_id", listId);
  if (briefId) query = query.eq("brief_id", briefId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Prospect[];
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const { data, error } = await supabase
    .from("prospects")
    .select(PROSPECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Prospect) ?? null;
}

export async function createProspectList(input: {
  name: string;
  audience: string;
  temperature: string;
  brief_id?: string | null;
}): Promise<ProspectList> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("prospect_lists")
    .insert({ ...input, user_id: userId })
    .select("id, brief_id, name, audience, temperature, notes, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as ProspectList;
}

export async function saveProspects(
  prospects: NewProspect[],
  options: { listId: string; audience: string; temperature: string; briefId?: string | null },
): Promise<number> {
  if (prospects.length === 0) return 0;
  const userId = await currentUserId();
  const rows = prospects.map((prospect) => ({
    user_id: userId,
    list_id: options.listId,
    brief_id: options.briefId ?? null,
    name: prospect.name,
    title: prospect.title ?? null,
    company: prospect.company ?? null,
    blurb: prospect.blurb ?? null,
    location: prospect.location ?? null,
    linkedin_url: prospect.linkedin_url ?? null,
    social_url: prospect.social_url ?? null,
    website: prospect.website ?? null,
    email: prospect.email ?? null,
    why_fits: prospect.why_fits ?? null,
    audience: prospect.audience ?? options.audience,
    temperature: prospect.temperature ?? options.temperature,
  }));
  const { error } = await supabase.from("prospects").insert(rows);
  if (error) throw error;
  await supabase
    .from("prospect_lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", options.listId);
  return rows.length;
}

export async function updateProspect(
  id: string,
  values: Partial<Pick<Prospect, "status" | "temperature" | "notes" | "list_id" | "email">>,
) {
  const { error } = await supabase
    .from("prospects")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProspect(id: string) {
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteProspectList(id: string) {
  const { error } = await supabase.from("prospect_lists").delete().eq("id", id);
  if (error) throw error;
}

export function prospectSummary(prospect: Prospect | NewProspect): string {
  const lines = [
    `Name: ${prospect.name}`,
    prospect.title ? `Title: ${prospect.title}` : "",
    prospect.company ? `Company: ${prospect.company}` : "",
    prospect.location ? `Location: ${prospect.location}` : "",
    prospect.blurb ? `About them: ${prospect.blurb}` : "",
    prospect.why_fits ? `Why they fit: ${prospect.why_fits}` : "",
    prospect.linkedin_url ? `LinkedIn: ${prospect.linkedin_url}` : "",
    prospect.social_url ? `Social: ${prospect.social_url}` : "",
    prospect.website ? `Website: ${prospect.website}` : "",
    prospect.email ? `Email: ${prospect.email}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
