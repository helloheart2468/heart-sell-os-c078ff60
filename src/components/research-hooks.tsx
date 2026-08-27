import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getProspect, updateProspect } from "@/lib/prospects";

export type ResearchHook = { text: string; source?: string };

export type ProspectResearchOutput = {
  person?: string;
  commonalities?: ResearchHook[];
  compliments?: ResearchHook[];
  recent_signals?: ResearchHook[];
  citations?: string[];
  notes?: string;
  prospect_id?: string | null;
  error?: string;
};

const GROUPS: { key: keyof ProspectResearchOutput; label: string }[] = [
  { key: "commonalities", label: "Possible commonality" },
  { key: "compliments", label: "Specific compliment" },
  { key: "recent_signals", label: "Recent signal" },
];

export function ResearchHooks({
  output,
  onUse,
}: {
  output: ProspectResearchOutput;
  onUse?: (text: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows: { id: string; label: string; hook: ResearchHook }[] = [];
  for (const group of GROUPS) {
    const list = (output[group.key] as ResearchHook[] | undefined) ?? [];
    list.forEach((hook, index) => {
      rows.push({ id: `${String(group.key)}-${index}`, label: group.label, hook });
    });
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = rows.filter((row) => selected.has(row.id));

  const saveNotes = useMutation({
    mutationFn: async () => {
      const prospectId = output.prospect_id;
      if (!prospectId) throw new Error("This person isn't saved to a list yet.");
      const existing = await getProspect(prospectId);
      const block = chosen
        .map((row) => `${row.label}: ${row.hook.text}${row.hook.source ? ` (${row.hook.source})` : ""}`)
        .join("\n");
      const notes = [existing?.notes?.trim(), `Research:\n${block}`].filter(Boolean).join("\n\n");
      await updateProspect(prospectId, { notes });
    },
    onSuccess: () => toast.success("Saved to their notes."),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Couldn't save those notes."),
  });

  if (output.error) {
    return <p className="text-sm text-destructive">{output.error}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-foreground">
          Nothing solid found on {output.person || "them"} yet.
        </p>
        {output.notes ? (
          <p className="mt-1 text-muted-foreground">{output.notes}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-muted-foreground">
        What I could verify about {output.person || "them"} — pick what's true and usable.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(row.id)}
              onChange={() => toggle(row.id)}
              aria-label={`Use: ${row.hook.text}`}
              className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--primary)]"
            />
            <span className="min-w-0 flex-1 text-foreground/90">
              <span className="text-muted-foreground">{row.label} · </span>
              {row.hook.text}
              {row.hook.source ? (
                <a
                  href={row.hook.source}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {output.notes ? (
        <p className="mt-3 text-muted-foreground">{output.notes}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() =>
            onUse?.(
              `Use these verified details in my message — nothing else:\n${chosen
                .map((row) => `- ${row.label}: ${row.hook.text}${row.hook.source ? ` (${row.hook.source})` : ""}`)
                .join("\n")}`,
            )
          }
          className="h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Use these in my message
        </button>
        {output.prospect_id ? (
          <button
            type="button"
            disabled={chosen.length === 0 || saveNotes.isPending}
            onClick={() => saveNotes.mutate()}
            className="h-10 rounded-full border border-border px-5 text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            {saveNotes.isPending ? "Saving…" : "Save to their notes"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
