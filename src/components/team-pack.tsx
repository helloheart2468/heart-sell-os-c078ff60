import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SLOTS, type Campaign, type CampaignSlot } from "@/lib/campaigns";
import { downloadDocx, downloadPdf } from "@/lib/documents";
import { download, slugify } from "@/lib/exports";
import type { Prospect } from "@/lib/prospects";
import { teamPackBlocks, teamPackCsv } from "@/lib/team-pack";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  prospects: Prospect[];
  personalised: Map<string, string>;
};

export function TeamPack({ open, onOpenChange, campaign, prospects, personalised }: Props) {
  const [assignee, setAssignee] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<CampaignSlot[]>(["connection_note", "message_1", "message_2"]);
  const [format, setFormat] = useState<"docx" | "pdf" | "csv">("docx");
  const [busy, setBusy] = useState(false);

  const options = { assignee, goal, slots, ...(notes.trim() ? { notes: notes.trim() } : {}) };
  const base = `${slugify(campaign.name)}-pack${assignee ? `-${slugify(assignee)}` : ""}`;

  const run = async () => {
    if (slots.length === 0) {
      toast.error("Pick at least one message to include.");
      return;
    }
    setBusy(true);
    try {
      if (format === "csv") {
        download(`${base}.csv`, teamPackCsv(campaign, prospects, personalised, options));
      } else {
        const blocks = teamPackBlocks(campaign, prospects, personalised, options);
        if (format === "docx") await downloadDocx(`${base}.docx`, blocks);
        else await downloadPdf(`${base}.pdf`, blocks);
      }
      toast.success("Pack downloaded.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't build that pack.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSlot = (slot: CampaignSlot) =>
    setSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Prepare this for my team</DialogTitle>
          <DialogDescription>
            A pack someone else can work straight through: who these people are, the rules, and the
            exact messages to send.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="text-muted-foreground">Who is doing this outreach?</span>
            <input
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              placeholder="Name of your VA, assistant or rep"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground"
            />
          </label>

          <label className="block">
            <span className="text-muted-foreground">Their goal for the week</span>
            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="e.g. 25 connection requests and 5 conversations booked"
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground"
            />
          </label>

          <label className="block">
            <span className="text-muted-foreground">Anything else they should know</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Tone, what to escalate, when you're available for questions."
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-foreground"
            />
          </label>

          <fieldset>
            <legend className="text-muted-foreground">Include</legend>
            <div className="mt-2 space-y-2">
              {SLOTS.map((entry) => (
                <label key={entry.slot} className="flex items-center gap-2 text-foreground">
                  <input
                    type="checkbox"
                    checked={slots.includes(entry.slot)}
                    onChange={() => toggleSlot(entry.slot)}
                    className="h-5 w-5 accent-[color:var(--primary)]"
                  />
                  {entry.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-muted-foreground">Format</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ["docx", "Word document"],
                ["pdf", "PDF checklist"],
                ["csv", "CSV"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value as typeof format)}
                  className={`h-9 rounded-full border px-4 ${
                    format === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="text-muted-foreground">
            {prospects.length} {prospects.length === 1 ? "person" : "people"} in this pack.
          </p>

          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="h-11 w-full rounded-full bg-primary font-medium text-primary-foreground disabled:opacity-40"
          >
            {busy ? "Building…" : "Download the pack"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
