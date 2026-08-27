import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getProspect, updateProspect } from "@/lib/prospects";

export type HookConfidence = "high" | "medium" | "low";

export type ResearchHook = {
  text: string;
  source?: string;
  confidence?: HookConfidence;
  confidence_reason?: string;
};

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

export type HookRow = { id: string; label: string; hook: ResearchHook };

export function hookRows(output: ProspectResearchOutput, prefix = ""): HookRow[] {
  const rows: HookRow[] = [];
  for (const group of GROUPS) {
    const list = (output[group.key] as ResearchHook[] | undefined) ?? [];
    list.forEach((hook, index) => {
      rows.push({ id: `${prefix}${String(group.key)}-${index}`, label: group.label, hook });
    });
  }
  return rows;
}

export function ConfidenceBadge({ hook }: { hook: ResearchHook }) {
  const level: HookConfidence = hook.confidence ?? "medium";
  const tone =
    level === "high"
      ? "border-primary/40 bg-primary/10 text-primary"
      : level === "low"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground";
  return (
    <span
      title={hook.confidence_reason || undefined}
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-sm ${tone}`}
    >
      {level} confidence
    </span>
  );
}

/** One reviewable hook: pick it, edit the wording, see where it came from. */
export function HookReviewRow({
  row,
  checked,
  value,
  onToggle,
  onChange,
}: {
  row: HookRow;
  checked: boolean;
  value: string;
  onToggle: () => void;
  onChange: (text: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border/70 p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Use: ${row.hook.text}`}
          className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--primary)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">{row.label}</span>
            <ConfidenceBadge hook={row.hook} />
            {row.hook.source ? (
              <a
                href={row.hook.source}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
              >
                source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-muted-foreground">no source — treat as [confirm]</span>
            )}
          </div>

          {checked ? (
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={2}
              aria-label="Edit before approving"
              className="mt-2 w-full rounded-lg border border-input bg-background p-2 text-foreground"
            />
          ) : (
            <p className="mt-1 text-foreground/90">{row.hook.text}</p>
          )}

          {row.hook.confidence_reason ? (
            <p className="mt-1 text-muted-foreground">{row.hook.confidence_reason}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function useHookReview(rows: HookRow[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});

  const toggle = (id: string, original: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setEdits((current) => (current[id] === undefined ? { ...current, [id]: original } : current));
      }
      return next;
    });
  };

  const chosen = rows
    .filter((row) => selected.has(row.id))
    .map((row) => ({ ...row, text: (edits[row.id] ?? row.hook.text).trim() }))
    .filter((row) => row.text.length > 0);

  return {
    selected,
    edits,
    toggle,
    setEdit: (id: string, text: string) => setEdits((prev) => ({ ...prev, [id]: text })),
    chosen,
  };
}

export function approvedBlock(
  chosen: { label: string; text: string; hook: ResearchHook }[],
): string {
  return chosen
    .map(
      (row) =>
        `- ${row.label}: ${row.text}${row.hook.source ? ` (${row.hook.source})` : " [confirm]"} — ${row.hook.confidence ?? "medium"} confidence`,
    )
    .join("\n");
}

export function ResearchHooks({
  output,
  onUse,
}: {
  output: ProspectResearchOutput;
  onUse?: (text: string) => void;
}) {
  const rows = hookRows(output);
  const review = useHookReview(rows);

  const saveNotes = useMutation({
    mutationFn: async () => {
      const prospectId = output.prospect_id;
      if (!prospectId) throw new Error("This person isn't saved to a list yet.");
      const existing = await getProspect(prospectId);
      const notes = [existing?.notes?.trim(), `Research:\n${approvedBlock(review.chosen)}`]
        .filter(Boolean)
        .join("\n\n");
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
        What I could verify about {output.person || "them"} — tick what's true, edit the wording,
        then approve it into your message.
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <HookReviewRow
            key={row.id}
            row={row}
            checked={review.selected.has(row.id)}
            value={review.edits[row.id] ?? row.hook.text}
            onToggle={() => review.toggle(row.id, row.hook.text)}
            onChange={(text) => review.setEdit(row.id, text)}
          />
        ))}
      </ul>

      {output.notes ? (
        <p className="mt-3 text-muted-foreground">{output.notes}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={review.chosen.length === 0}
          onClick={() =>
            onUse?.(
              `Use these approved details in my message exactly as worded — nothing else:\n${approvedBlock(review.chosen)}`,
            )
          }
          className="h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Approve &amp; use in my message
        </button>
        {output.prospect_id ? (
          <button
            type="button"
            disabled={review.chosen.length === 0 || saveNotes.isPending}
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
