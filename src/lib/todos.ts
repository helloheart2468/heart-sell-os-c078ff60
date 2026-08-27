import { supabase } from "@/integrations/supabase/client";

export type Todo = {
  id: string;
  brief_id: string | null;
  thread_id: string | null;
  prospect_id: string | null;
  title: string;
  agent: string | null;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
};

const TODO_COLUMNS =
  "id, brief_id, thread_id, prospect_id, title, agent, is_done, done_at, created_at";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function listTodos(briefId?: string | null): Promise<Todo[]> {
  let query = supabase.from("todos").select(TODO_COLUMNS);
  if (briefId) query = query.eq("brief_id", briefId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Todo[];
}

export async function addTodo(input: {
  title: string;
  agent?: string | null;
  briefId?: string | null;
  threadId?: string | null;
  prospectId?: string | null;
}): Promise<Todo> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: userId,
      title: input.title,
      agent: input.agent ?? null,
      brief_id: input.briefId ?? null,
      thread_id: input.threadId ?? null,
      prospect_id: input.prospectId ?? null,
    })
    .select(TODO_COLUMNS)
    .single();
  if (error) throw error;
  return data as Todo;
}

export async function setTodoDone(id: string, done: boolean) {
  const { error } = await supabase
    .from("todos")
    .update({ is_done: done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}
