import { useState } from "react";
import { toast } from "sonner";

import {
  HookReviewRow,
  approvedBlock,
  hookRows,
  useHookReview,
  type ProspectResearchOutput,
} from "@/components/research-hooks";
import { getProspect, updateProspect } from "@/lib/prospects";

export type BulkResearchEntry = {
  prospect_id: string;
  name: string;
  result?: ProspectResearchOutput;
  error?: string;
};

function EntryCard({
  entry,
  onDraft,
}: {
  entry: BulkResearchEntry;
  onDraft: (prospectId: string, approved: string) => void;
}) {
  const output = entry.result ?? {};
  const rows = hookRows(output, `${entry.prospect_id}-`);
  const review = useHookReview(rows);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const existing = await getProspect(entry.prospect_id);
      const notes = [existing?.notes?.trim(), `Research:\n${approvedBlock(review.chosen)}`]
        .filter(Boolean)
        .join("\n\n");
      await updateProspect(entry.prospect_id, { notes });
      toast.success(`Saved to ${entry.name}'s notes.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save those notes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="paper-panel p-5">
      <h3 className="font-display text-2xl text-foreground">{entry.name}</h3>

      {entry.error ? (
        <p className="mt-2 text-destructive">{entry.error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-muted-foreground">
          {output.notes || "Nothing solid found on the public web — keep them Cold for now."}
        </p>
      ) : (
        <>
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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={review.chosen.length === 0}
              onClick={() => onDraft(entry.prospect_id, approvedBlock(review.chosen))}
              className="h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground disabled:opacity-40"
            >
              Approve &amp; draft outreach
            </button>
            <button
              type="button"
              disabled={review.chosen.length === 0 || saving}
              onClick={() => void save()}
              className="h-10 rounded-full border border-border px-5 text-foreground hover:bg-muted disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save to their notes"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export function BulkResearchResults({
  entries,
  onDraft,
}: {
  entries: BulkResearchEntry[];
  onDraft: (prospectId: string, approved: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mt-8 space-y-4">
      <h2 className="font-display text-3xl text-foreground">Research to review</h2>
      <p className="text-muted-foreground">
        Every line shows where it came from and how much to trust it. Tick, edit the wording, then
        approve.
      </p>
      {entries.map((entry) => (
        <EntryCard key={entry.prospect_id} entry={entry} onDraft={onDraft} />
      ))}
    </section>
  );
}
