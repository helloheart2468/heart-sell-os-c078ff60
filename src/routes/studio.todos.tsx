import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useOffers } from "@/lib/offers";
import { addTodo, deleteTodo, listTodos, setTodoDone } from "@/lib/todos";

export const Route = createFileRoute("/studio/todos")({
  head: () => ({
    meta: [
      { title: "My to-dos — Heart Sell OS" },
      {
        name: "description",
        content:
          "One simple list of the outbound actions you committed to — added straight from your Heart Sell sessions.",
      },
      { property: "og:title", content: "My to-dos — Heart Sell OS" },
      {
        property: "og:description",
        content: "Tick off the outreach actions your guides suggested. No weekly planner required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodosPage,
});

function TodosPage() {
  const { currentId, currentOffer } = useOffers();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const todos = useQuery({
    queryKey: ["todos", currentId ?? "all"],
    queryFn: () => listTodos(currentId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["todos"] });

  const run = useMutation({
    mutationFn: async (action: Promise<unknown>) => action,
    onSuccess: () => void refresh(),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Couldn't update that to-do."),
  });

  const open = (todos.data ?? []).filter((todo) => !todo.is_done);
  const done = (todos.data ?? []).filter((todo) => todo.is_done);

  const submit = async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    run.mutate(addTodo({ title, briefId: currentId }));
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-14">
        <h1 className="font-display text-4xl text-foreground">My to-dos</h1>
        <p className="mt-2 text-muted-foreground">
          For <span className="text-foreground">{currentOffer?.name || "your offer"}</span>. Add
          actions as your guides suggest them, tick them off when they're done.
        </p>

        <div className="mt-8 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder="Add your own action…"
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-foreground"
          />
          <button
            type="button"
            onClick={() => void submit()}
            className="h-11 shrink-0 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Add
          </button>
        </div>

        <ul className="mt-8 space-y-2">
          {open.length === 0 ? (
            <li className="paper-panel p-6 text-muted-foreground">
              Nothing on your list. When a guide suggests an action in chat, hit the plus next to it.
            </li>
          ) : null}
          {open.map((todo) => (
            <li key={todo.id} className="paper-panel flex items-start gap-3 p-4">
              <input
                type="checkbox"
                checked={false}
                onChange={() => run.mutate(setTodoDone(todo.id, true))}
                aria-label={`Mark done: ${todo.title}`}
                className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--primary)]"
              />
              <span className="min-w-0 flex-1 text-foreground">
                {todo.title}
                {todo.agent ? (
                  <span className="text-muted-foreground"> · from {todo.agent}</span>
                ) : null}
              </span>
              <button
                type="button"
                aria-label="Delete to-do"
                onClick={() => run.mutate(deleteTodo(todo.id))}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        {done.length > 0 ? (
          <details className="mt-8">
            <summary className="cursor-pointer text-muted-foreground">
              Done ({done.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {done.map((todo) => (
                <li key={todo.id} className="flex items-start gap-3 px-4 py-2">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => run.mutate(setTodoDone(todo.id, false))}
                    aria-label={`Mark not done: ${todo.title}`}
                    className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--primary)]"
                  />
                  <span className="min-w-0 flex-1 text-muted-foreground line-through">
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Delete to-do"
                    onClick={() => run.mutate(deleteTodo(todo.id))}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </main>
  );
}
