import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { addTodo } from "@/lib/todos";

export type ActionSuggestionsOutput = {
  actions?: { title: string; about?: string }[];
};

export function ActionSuggestions({
  output,
  agent,
  briefId,
  threadId,
}: {
  output: ActionSuggestionsOutput;
  agent?: string;
  briefId?: string | null;
  threadId?: string;
}) {
  const queryClient = useQueryClient();
  const [added, setAdded] = useState<Set<number>>(new Set());
  const actions = (output.actions ?? []).filter((action) => action?.title?.trim());

  if (actions.length === 0) return null;

  const add = async (index: number, title: string) => {
    try {
      await addTodo({
        title,
        agent: agent ?? null,
        briefId: briefId ?? null,
        threadId: threadId ?? null,
      });
      setAdded((prev) => new Set(prev).add(index));
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Added to your to-dos.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add that to-do.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="px-1 pb-1 text-sm text-muted-foreground">Next actions</p>
      <ul className="space-y-1">
        {actions.map((action, index) => {
          const isAdded = added.has(index);
          return (
            <li
              key={`${action.title}-${index}`}
              className="flex items-start gap-2 rounded-lg px-1 py-1"
            >
              <button
                type="button"
                onClick={() => void add(index, action.title)}
                disabled={isAdded}
                aria-label={isAdded ? "Added to to-dos" : "Add to my to-dos"}
                title={isAdded ? "Added" : "Add to my to-dos"}
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isAdded
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
              <span className="min-w-0 flex-1 text-foreground/90">
                {action.title}
                {action.about ? (
                  <span className="text-muted-foreground"> · {action.about}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
