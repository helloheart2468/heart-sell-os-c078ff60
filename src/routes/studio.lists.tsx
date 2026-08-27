import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  BulkResearchResults,
  type BulkResearchEntry,
} from "@/components/bulk-research";
import { FollowUpStrip } from "@/components/followup-strip";
import { startSession } from "@/lib/handoff";

import { BUCKET_LABELS, bucketFor, formatDue } from "@/lib/followups";
import { useOffers } from "@/lib/offers";

import { researchProspectsBulk } from "@/lib/research.functions";
import {
  deleteProspect,
  deleteProspectList,
  listProspectLists,
  listProspects,
  prospectSummary,
  updateProspect,
  type Prospect,
} from "@/lib/prospects";

export const Route = createFileRoute("/studio/lists")({
  head: () => ({
    meta: [
      { title: "My lists — Heart Sell OS" },
      {
        name: "description",
        content:
          "Every prospect Scout found and you saved: clients, partners and ecosystem contacts, ready for outreach or call prep.",
      },
      { property: "og:title", content: "My lists — Heart Sell OS" },
      {
        property: "og:description",
        content: "Saved clients, partners and ecosystem contacts, ready for Quill and Ace.",
      },
    ],
  }),
  component: ListsPage,
});

function ListsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeList, setActiveList] = useState<string | "all">("all");
  const [allOffers, setAllOffers] = useState(false);
  const { currentId, currentOffer, offers } = useOffers();
  const scope = allOffers ? null : currentId;

  const lists = useQuery({
    queryKey: ["prospect-lists", scope ?? "all"],
    queryFn: () => listProspectLists(scope ?? undefined),
  });
  const prospects = useQuery({
    queryKey: ["prospects", activeList, scope ?? "all"],
    queryFn: () => listProspects(activeList === "all" ? undefined : activeList, scope),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["prospects"] });
    await queryClient.invalidateQueries({ queryKey: ["prospect-lists"] });
  };

  const handOff = async (agent: "quill" | "ace", prospect: Prospect) => {
    const block = prospectSummary(prospect);
    const prompt =
      agent === "quill"
        ? `I want to reach out to this person from my saved list:\n\n${block}\n\nHelp me write the CCRA first message. Ask me for any real commonality or compliment you need — don't invent one.`
        : `I have a call with ${prospect.name}. Here's what we have on file:\n\n${block}\n\nBuild my prep sheet.`;
    try {
      const threadId = await startSession(agent, "chat", prompt, undefined, prospect.brief_id ?? currentId);
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't hand that off.");
    }
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<BulkResearchEntry[]>([]);
  const [researching, setResearching] = useState(false);
  const runResearch = useServerFn(researchProspectsBulk);

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visible = prospects.data ?? [];

  const research = async () => {
    const ids = [...selected].slice(0, 10);
    if (ids.length === 0) return;
    setResearching(true);
    setEntries([]);
    try {
      const result = await runResearch({ data: { prospectIds: ids } });
      setEntries(result.entries as BulkResearchEntry[]);
      toast.success(`Researched ${result.entries.length} ${result.entries.length === 1 ? "person" : "people"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk research failed.");
    } finally {
      setResearching(false);
    }
  };

  const draftWithHooks = async (prospectId: string, approved: string) => {
    const prospect = visible.find((row) => row.id === prospectId);
    if (!prospect) return;
    const prompt = `I want to reach out to this person from my saved list:\n\n${prospectSummary(prospect)}\n\nI've reviewed and approved these verified details — use them exactly as worded, and nothing else:\n${approved}\n\nWrite the CCRA first message.`;
    try {
      const threadId = await startSession(
        "quill",
        "chat",
        prompt,
        undefined,
        prospect.brief_id ?? currentId,
      );
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't hand that off.");
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-foreground">My lists</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Everyone Scout found and you kept. Send anyone straight to Quill for outreach, or to Ace
          when a call lands.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-muted-foreground">
          <span>
            Showing{" "}
            <span className="text-foreground">
              {allOffers ? "every offer" : currentOffer?.name || "your current offer"}
            </span>
          </span>
          {offers.length > 1 ? (
            <button
              type="button"
              onClick={() => setAllOffers((value) => !value)}
              className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
            >
              {allOffers ? "Just this offer" : "Show all offers"}
            </button>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4" /> Upload a list I already have
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() => setActiveList("all")}
            className={`h-9 rounded-full border px-4 ${
              activeList === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            Everyone
          </button>
          {(lists.data ?? []).map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setActiveList(list.id)}
              className={`h-9 rounded-full border px-4 ${
                activeList === list.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {list.name}
            </button>
          ))}
        </div>

        {activeList !== "all" ? (
          <button
            type="button"
            onClick={async () => {
              await deleteProspectList(activeList);
              setActiveList("all");
              await refresh();
              toast.success("List deleted.");
            }}
            className="mt-3 text-muted-foreground underline underline-offset-4 hover:text-destructive"
          >
            Delete this list
          </button>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          <button
            type="button"
            onClick={() =>
              setSelected((prev) =>
                prev.size === visible.length
                  ? new Set()
                  : new Set(visible.slice(0, 10).map((row) => row.id)),
              )
            }
            disabled={visible.length === 0}
            className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted disabled:opacity-40"
          >
            {selected.size === visible.length && visible.length > 0
              ? "Clear selection"
              : "Select up to 10"}
          </button>
          <span className="text-muted-foreground">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => void research()}
            disabled={selected.size === 0 || researching}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 font-medium text-primary-foreground disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            {researching
              ? "Researching…"
              : `Research commonality & compliment${selected.size ? ` (${selected.size})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => void enrich()}
            disabled={selected.size === 0 || enriching}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-foreground hover:bg-muted disabled:opacity-40"
          >
            <Wand2 className="h-4 w-4" />
            {enriching ? "Looking them up…" : "Fill in missing details"}
          </button>
          <span className="text-muted-foreground">Up to 10 at a time.</span>
        </div>


        <BulkResearchResults entries={entries} onDraft={(id, approved) => void draftWithHooks(id, approved)} />

        <div className="mt-8 space-y-3">
          {visible.map((prospect) => {
            const isExpanded = expanded.has(prospect.id);
            return (
              <article key={prospect.id} className="paper-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(prospect.id)}
                      onChange={() => toggleSelected(prospect.id)}
                      aria-label={`Select ${prospect.name} for research`}
                      className="mt-2 h-5 w-5 shrink-0 accent-[color:var(--primary)]"
                    />
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl text-foreground">{prospect.name}</h2>
                      <p className="text-muted-foreground">
                        {[prospect.title, prospect.company, prospect.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {(() => {
                        const bucket = bucketFor(prospect);
                        if (!bucket) return null;
                        return (
                          <span className="mt-1 inline-block rounded-full bg-muted px-3 py-0.5 text-muted-foreground">
                            {bucket === "booked"
                              ? `Call ${formatDue(prospect.call_at)}`
                              : `${BUCKET_LABELS[bucket]} · ${formatDue(prospect.next_action_at)}`}
                          </span>
                        );
                      })()}
                    </div>

                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(prospect.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`prospect-body-${prospect.id}`}
                    aria-label={isExpanded ? `Collapse ${prospect.name}` : `Expand ${prospect.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isExpanded ? (
                  <div id={`prospect-body-${prospect.id}`} className="mt-4 space-y-3 border-t border-border pt-4">
                    <FollowUpStrip prospect={prospect} briefId={currentId} onChange={refresh} />
                    {prospect.blurb ? (
                      <p className="text-foreground/80">{prospect.blurb}</p>
                    ) : null}
                    {prospect.why_fits ? (
                      <p className="text-muted-foreground">Why they fit: {prospect.why_fits}</p>
                    ) : null}


                    <div className="flex flex-wrap gap-4">
                      {[
                        ["LinkedIn", prospect.linkedin_url],
                        ["Social", prospect.social_url],
                        ["Website", prospect.website],
                      ]
                        .filter(([, href]) => Boolean(href))
                        .map(([label, href]) => (
                          <a
                            key={label as string}
                            href={href as string}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                          >
                            {label as string} <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      {prospect.email ? (
                        <a
                          href={`mailto:${prospect.email}`}
                          className="text-primary underline underline-offset-4"
                        >
                          {prospect.email}
                        </a>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handOff("quill", prospect)}
                          className="h-9 rounded-full bg-primary px-4 font-medium text-primary-foreground"
                        >
                          Draft outreach
                        </button>
                        <button
                          type="button"
                          onClick={() => handOff("ace", prospect)}
                          className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
                        >
                          Prep a call
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={prospect.temperature}
                          onChange={async (event) => {
                            await updateProspect(prospect.id, { temperature: event.target.value });
                            await refresh();
                          }}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-foreground"
                        >
                          {["Hot", "Warm", "Cold"].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label={`Remove ${prospect.name}`}
                          onClick={async () => {
                            await deleteProspect(prospect.id);
                            await refresh();
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}

          {prospects.data?.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Nothing saved yet. Ask Scout to find people and save the ones you like.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
