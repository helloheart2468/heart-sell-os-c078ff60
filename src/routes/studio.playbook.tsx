import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { downloadDocx, downloadPdf, markdownToBlocks, type DocBlock } from "@/lib/documents";
import { slugify } from "@/lib/exports";
import { useOffers } from "@/lib/offers";
import { generatePlaybook } from "@/lib/playbook.functions";
import {
  CAPACITY_OPTIONS,
  deletePlaybook,
  FOCUS_OPTIONS,
  listPlaybooks,
  savePlaybook,
  WHO_SELLS_OPTIONS,
  type Playbook,
  type PlaybookGoal,
  type PlaybookSection,
} from "@/lib/playbooks";

export const Route = createFileRoute("/studio/playbook")({
  head: () => ({
    meta: [
      { title: "Your playbook — Heart Sell OS" },
      {
        name: "description",
        content:
          "Answer what you're selling for and get a Heart Sell operating manual written from your own audit — download it as a PDF or Word document.",
      },
      { property: "og:title", content: "Your playbook — Heart Sell OS" },
      {
        property: "og:description",
        content: "A Heart Sell operating manual built from your audit, ready to print or hand to your team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlaybookPage,
});

const EMPTY_GOAL: PlaybookGoal = {
  who_sells: WHO_SELLS_OPTIONS[0],
  focus: FOCUS_OPTIONS[0],
  outcome: "",
  capacity: CAPACITY_OPTIONS[1],
};

function PlaybookPage() {
  const queryClient = useQueryClient();
  const { currentId, currentOffer } = useOffers();
  const run = useServerFn(generatePlaybook);

  const [goal, setGoal] = useState<PlaybookGoal>(EMPTY_GOAL);
  const [sections, setSections] = useState<PlaybookSection[]>([]);
  const [current, setCurrent] = useState<Playbook | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const saved = useQuery({
    queryKey: ["playbooks", currentId ?? "all"],
    queryFn: () => listPlaybooks(currentId),
  });

  const title = `${currentOffer?.name ? `${currentOffer.name} — ` : ""}Heart Sell playbook`;
  const eventMode = /event|workshop/i.test(goal.focus);
  const teamMode = /team|va|assistant/i.test(goal.who_sells);

  const persist = async (next: PlaybookSection[], id?: string) => {
    const record = await savePlaybook({
      ...(id ? { id } : {}),
      briefId: currentId,
      title,
      goal,
      sections: next,
    });
    setCurrent(record);
    await queryClient.invalidateQueries({ queryKey: ["playbooks"] });
    return record;
  };

  const generate = async () => {
    setGenerating(true);
    setSections([]);
    try {
      const result = await run({ data: { goal, briefId: currentId ?? null } });
      setSections(result.sections);
      await persist(result.sections);
      toast.success("Your playbook is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't write that playbook.");
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async (heading: string) => {
    setRegenerating(heading);
    try {
      const result = await run({ data: { goal, briefId: currentId ?? null, only: heading } });
      const replacement = result.sections[0];
      if (!replacement) throw new Error("Nothing came back.");
      const next = sections.map((section) =>
        section.heading === heading ? replacement : section,
      );
      setSections(next);
      await persist(next, current?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't rewrite that section.");
    } finally {
      setRegenerating(null);
    }
  };

  const blocks = (): DocBlock[] => {
    const out: DocBlock[] = [
      { type: "title", text: title },
      {
        type: "subtitle",
        text: [goal.who_sells, goal.focus, goal.outcome].filter(Boolean).join(" · "),
      },
    ];
    sections.forEach((section, index) => {
      if (index > 0) out.push({ type: "rule" });
      out.push({ type: "h2", text: section.heading });
      out.push(...markdownToBlocks(section.body));
    });
    return out;
  };

  const exportDoc = async (kind: "pdf" | "docx") => {
    try {
      const name = `${slugify(title)}.${kind}`;
      if (kind === "pdf") await downloadPdf(name, blocks());
      else await downloadDocx(name, blocks());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl text-foreground">Your Heart Sell playbook</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Tell us what you're selling for and who's doing the selling. We'll write the manual from
          your own Audience Audit — scripts, sequences and all — ready to print or hand over.
        </p>

        <section className="paper-panel mt-8 space-y-4 p-6">
          <h2 className="font-display text-2xl text-foreground">What's the goal?</h2>

          <label className="block">
            <span className="text-muted-foreground">Who is doing the selling?</span>
            <select
              value={goal.who_sells}
              onChange={(event) => setGoal({ ...goal, who_sells: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-foreground"
            >
              {WHO_SELLS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-muted-foreground">What is this manual for?</span>
            <select
              value={goal.focus}
              onChange={(event) => setGoal({ ...goal, focus: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-foreground"
            >
              {FOCUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {eventMode ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-muted-foreground">Event or workshop name</span>
                <input
                  value={goal.event_name ?? ""}
                  onChange={(event) => setGoal({ ...goal, event_name: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground"
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground">When is it?</span>
                <input
                  value={goal.event_date ?? ""}
                  onChange={(event) => setGoal({ ...goal, event_date: event.target.value })}
                  placeholder="e.g. 14 October"
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground"
                />
              </label>
            </div>
          ) : null}

          {teamMode ? (
            <label className="block">
              <span className="text-muted-foreground">Tell us about the people selling</span>
              <textarea
                value={goal.team_notes ?? ""}
                onChange={(event) => setGoal({ ...goal, team_notes: event.target.value })}
                rows={2}
                placeholder="How many, how experienced, what they own today."
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-foreground"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-muted-foreground">What outcome do you want from it?</span>
            <textarea
              value={goal.outcome}
              onChange={(event) => setGoal({ ...goal, outcome: event.target.value })}
              rows={2}
              placeholder="e.g. Book 8 conversations a month without it eating my week."
              className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-foreground"
            />
          </label>

          <label className="block">
            <span className="text-muted-foreground">How much selling time is there?</span>
            <select
              value={goal.capacity}
              onChange={(event) => setGoal({ ...goal, capacity: event.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-foreground"
            >
              {CAPACITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="h-11 rounded-full bg-primary px-6 font-medium text-primary-foreground disabled:opacity-40"
          >
            {generating ? "Writing your manual…" : "Write my playbook"}
          </button>
          {generating ? (
            <p className="text-muted-foreground">
              This takes a minute — it's writing every section from your audit.
            </p>
          ) : null}
        </section>

        {sections.length > 0 ? (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void exportDoc("pdf")}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground"
              >
                <FileDown className="h-4 w-4" /> Download PDF
              </button>
              <button
                type="button"
                onClick={() => void exportDoc("docx")}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-foreground hover:bg-muted"
              >
                <FileDown className="h-4 w-4" /> Download Word
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {sections.map((section) => (
                <article key={section.heading} className="paper-panel p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-display text-2xl text-foreground">{section.heading}</h2>
                    <button
                      type="button"
                      onClick={() => void regenerate(section.heading)}
                      disabled={regenerating !== null}
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {regenerating === section.heading ? "Rewriting…" : "Rewrite"}
                    </button>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/90">
                    {section.body}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {(saved.data ?? []).length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl text-foreground">Saved playbooks</h2>
            <div className="mt-3 space-y-2">
              {(saved.data ?? []).map((playbook) => (
                <div
                  key={playbook.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="text-foreground">{playbook.title}</p>
                    <p className="text-muted-foreground">
                      {[playbook.goal.who_sells, playbook.goal.focus].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGoal({ ...EMPTY_GOAL, ...playbook.goal });
                        setSections(playbook.sections);
                        setCurrent(playbook);
                      }}
                      className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${playbook.title}`}
                      onClick={async () => {
                        await deletePlaybook(playbook.id);
                        if (current?.id === playbook.id) setCurrent(null);
                        await queryClient.invalidateQueries({ queryKey: ["playbooks"] });
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
