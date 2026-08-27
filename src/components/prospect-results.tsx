import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { startSession } from "@/lib/handoff";
import {
  createProspectList,
  listProspectLists,
  prospectSummary,
  saveProspects,
  type NewProspect,
} from "@/lib/prospects";

export type ProspectSearchOutput = {
  prospects?: NewProspect[];
  audience?: string;
  region?: string;
  citations?: string[];
  notes?: string;
  error?: string;
};

export function ProspectResults({
  output,
  briefId,
}: {
  output: ProspectSearchOutput;
  briefId?: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lists = useQuery({
    queryKey: ["prospect-lists", briefId ?? "all"],
    queryFn: () => listProspectLists(briefId ?? undefined),
  });

  const prospects = output.prospects ?? [];
  const audience = output.audience ?? "Ideal Clients";
  const [selected, setSelected] = useState<Set<number>>(new Set(prospects.map((_, i) => i)));
  const [listId, setListId] = useState<string>("new");
  const [listName, setListName] = useState<string>(
    `${audience}${output.region ? ` · ${output.region}` : ""}`,
  );
  const [temperature, setTemperature] = useState<string>("Cold");
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<string | null>(null);

  if (output.error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-card p-4 text-destructive">
        {output.error}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-muted-foreground">
        No prospects came back for that brief. Try loosening the filters or the geography.
      </div>
    );
  }

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const chosen = () => prospects.filter((_, index) => selected.has(index));

  const handleSave = async () => {
    const picked = chosen();
    if (picked.length === 0) {
      toast.error("Pick at least one person to save.");
      return;
    }
    setSaving(true);
    try {
      let targetList = listId;
      if (targetList === "new") {
        const created = await createProspectList({
          name: listName.trim() || `${audience} list`,
          audience,
          temperature,
          brief_id: briefId ?? null,
        });
        targetList = created.id;
      }
      await saveProspects(picked, {
        listId: targetList,
        audience,
        temperature,
        briefId: briefId ?? null,
      });
      setSavedIds(targetList);
      await queryClient.invalidateQueries({ queryKey: ["prospect-lists"] });
      await queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success(`Saved ${picked.length} to your list.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save those.");
    } finally {
      setSaving(false);
    }
  };

  const handOff = async (agent: "quill" | "ace") => {
    const picked = chosen();
    if (picked.length === 0) {
      toast.error("Pick at least one person first.");
      return;
    }
    const block = picked.map((p) => prospectSummary(p)).join("\n\n---\n\n");
    const prompt =
      agent === "quill"
        ? `I want to reach out to ${picked.length === 1 ? "this person" : `these ${picked.length} people`} from my ${audience} list. Here is everything Scout found:\n\n${block}\n\nHelp me write the CCRA first message${picked.length > 1 ? " for each of them" : ""}. Ask me for any real commonality or compliment you need — don't invent one.`
        : `I have a call coming up with ${picked[0]?.name}. Here's what we have on file:\n\n${block}\n\nBuild my prep sheet.`;
    try {
      const threadId = await startSession(agent, "chat", prompt, undefined, briefId ?? undefined);
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't hand that off.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-xl text-foreground">
          {prospects.length} found · {audience}
          {output.region ? ` · ${output.region}` : ""}
        </p>
        <button
          type="button"
          onClick={() =>
            setSelected(
              selected.size === prospects.length
                ? new Set()
                : new Set(prospects.map((_, i) => i)),
            )
          }
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {selected.size === prospects.length ? "Clear all" : "Select all"}
        </button>
      </div>

      {output.notes ? <p className="mt-2 text-muted-foreground">{output.notes}</p> : null}

      <ul className="mt-4 space-y-2">
        {prospects.map((prospect, index) => {
          const isOn = selected.has(index);
          return (
            <li key={`${prospect.name}-${index}`}>
              <button
                type="button"
                onClick={() => toggle(index)}
                className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
                  isOn ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                }`}
              >
                <span
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isOn ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {isOn ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{prospect.name}</span>
                  <span className="block text-muted-foreground">
                    {[prospect.title, prospect.company, prospect.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {prospect.blurb ? (
                    <span className="mt-1 block text-foreground/80">{prospect.blurb}</span>
                  ) : null}
                  {prospect.why_fits ? (
                    <span className="mt-1 block text-muted-foreground">
                      Why they fit: {prospect.why_fits}
                    </span>
                  ) : null}
                  <span className="mt-2 flex flex-wrap gap-3">
                    {[
                      ...socialLinks(prospect).map(
                        (link) => [link.platform, link.url] as [string, string],
                      ),
                      ["Website", prospect.website],
                    ]
                      .filter(([, href]) => Boolean(href))
                      .map(([label, href]) => (
                        <a
                          key={label as string}
                          href={href as string}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                        >
                          {label as string} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    {prospect.email ? (
                      <span className="text-muted-foreground">{prospect.email}</span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Save to</span>
          <select
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
          >
            <option value="new">＋ New list</option>
            {(lists.data ?? []).map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>

        {listId === "new" ? (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">List name</span>
            <input
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Temperature</span>
          <select
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
          >
            {["Hot", "Warm", "Cold"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save {selected.size} to list
        </button>
      </div>

      {savedIds ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handOff("quill")}
            className="h-10 rounded-full border border-border px-4 text-foreground hover:bg-muted"
          >
            Draft outreach with Quill
          </button>
          <button
            type="button"
            onClick={() => handOff("ace")}
            className="h-10 rounded-full border border-border px-4 text-foreground hover:bg-muted"
          >
            Prep a call with Ace
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/studio/lists" })}
            className="h-10 rounded-full border border-border px-4 text-foreground hover:bg-muted"
          >
            View my lists
          </button>
        </div>
      ) : null}
    </div>
  );
}
