import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DripifyWizard } from "@/components/dripify-wizard";
import { TeamPack } from "@/components/team-pack";
import { FollowUpStrip } from "@/components/followup-strip";
import {
  bodyFor,
  getCampaign,
  listCampaignMessages,
  saveCampaignMessage,
  SLOTS,
  updateCampaign,
  type CampaignSlot,
} from "@/lib/campaigns";
import { download, openChecklist, slugify, vaCsv, type VaRow } from "@/lib/exports";
import { startSession } from "@/lib/handoff";
import { listProspects, prospectSummary } from "@/lib/prospects";

export const Route = createFileRoute("/studio/campaigns/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign — Heart Sell OS" },
      {
        name: "description",
        content:
          "Write the sequence once, personalise it per person with Quill, then export to Dripify or a send-ready checklist.",
      },
      { property: "og:title", content: "Campaign — Heart Sell OS" },
      {
        property: "og:description",
        content: "Connection note, first message, follow-up — drafted, approved and exportable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ prospectId: string; slot: CampaignSlot } | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showPack, setShowPack] = useState(false);
  const [showTeamPack, setShowTeamPack] = useState(false);

  const campaign = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => getCampaign(campaignId),
  });
  const listId = campaign.data?.list_id ?? undefined;
  const prospects = useQuery({
    queryKey: ["prospects", "campaign", listId ?? "none"],
    queryFn: () => listProspects(listId, null),
    enabled: Boolean(listId),
  });
  const messages = useQuery({
    queryKey: ["campaign-messages", campaignId],
    queryFn: () => listCampaignMessages(campaignId),
  });

  const personalised = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages.data ?? []) {
      map.set(`${message.prospect_id}:${message.slot}`, message.body);
    }
    return map;
  }, [messages.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    await queryClient.invalidateQueries({ queryKey: ["campaign-messages", campaignId] });
    await queryClient.invalidateQueries({ queryKey: ["prospects"] });
  };

  const rows = prospects.data ?? [];
  const data = campaign.data;
  const missingLinkedIn = rows.filter((prospect) => !(prospect.linkedin_url ?? "").trim());

  const vaRows = (slot: CampaignSlot): VaRow[] =>
    rows.map((prospect) => ({
      prospect,
      message: data ? bodyFor(data, slot, personalised, prospect.id) : "",
      channel: data?.channel === "email" ? "Email" : "LinkedIn",
      campaignName: data?.name ?? "Campaign",
    }));

  const draftTemplateWithQuill = async (slot: CampaignSlot) => {
    if (!data) return;
    const meta = SLOTS.find((entry) => entry.slot === slot)!;
    const others = SLOTS.filter((entry) => entry.slot !== slot)
      .map((entry) => `${entry.label}:\n${(data[entry.slot] ?? "(not written yet)").trim()}`)
      .join("\n\n");
    const prompt = `I'm building an outreach campaign called "${data.name}" on ${
      data.channel === "email" ? "email" : "LinkedIn"
    }.

Write the **${meta.label}** for this campaign. ${meta.hint}${
      meta.limit ? ` Hard limit: ${meta.limit} characters.` : ""
    }

The rest of the sequence so far:
${others}
${
      data.purpose === "event"
        ? `\nThis campaign is an invitation to ${data.event_name || "an event"}${
            data.event_date ? ` on ${data.event_date}` : ""
          }${data.event_format ? ` (${data.event_format})` : ""}${
            data.event_link ? `. Registration: ${data.event_link}` : ""
          }. The ask is attendance, not a sale — invite them because it genuinely helps them.`
        : data.purpose === "launch"
          ? "\nThis campaign is around a launch, so there is a reason to reach out now — but the first message is still a conversation, not a pitch."
          : data.purpose === "reengage"
            ? "\nThese are people I've spoken to before, so reference that history honestly rather than opening cold."
            : ""
    }

Keep it in my voice, follow CCRA and the 7-Day Sales Path, and use [name]/[company] placeholders where a detail should be personalised. Never invent a commonality.`;
    const threadId = await startSession("quill", "chat", prompt, `${data.name} · ${meta.label}`, data.brief_id);
    await navigate({ to: "/studio/$threadId", params: { threadId } });
  };

  const personaliseWithQuill = async (prospectId: string, slot: CampaignSlot) => {
    if (!data) return;
    const prospect = rows.find((entry) => entry.id === prospectId);
    if (!prospect) return;
    const meta = SLOTS.find((entry) => entry.slot === slot)!;
    const prompt = `Personalise one message from my campaign "${data.name}".

${prospectSummary(prospect)}

The ${meta.label.toLowerCase()} template:
${(data[slot] ?? "(no template yet)").trim()}

Rewrite it for this person using only what's true above. ${meta.hint}${
      meta.limit ? ` Hard limit: ${meta.limit} characters.` : ""
    } If you need a commonality I don't have, research it or ask me — never invent one.`;
    const threadId = await startSession("quill", "chat", prompt, `${prospect.name} · ${meta.label}`, data.brief_id);
    await navigate({ to: "/studio/$threadId", params: { threadId } });
  };

  if (!data) {
    return (
      <main className="flex-1 px-6 py-12 text-muted-foreground">
        {campaign.isLoading ? "Loading campaign…" : "Campaign not found."}
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <Link to="/studio/campaigns" className="text-muted-foreground hover:text-foreground">
          ← All campaigns
        </Link>
        <h1 className="mt-3 font-display text-4xl text-foreground">{data.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {data.channel === "email" ? "Email" : "LinkedIn"} · {rows.length} people
          {missingLinkedIn.length > 0
            ? ` · ${missingLinkedIn.length} missing a LinkedIn URL`
            : ""}
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="font-display text-2xl text-foreground">The sequence</h2>
          {SLOTS.map((meta) => {
            const value = data[meta.slot] ?? "";
            return (
              <div key={meta.slot} className="paper-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-xl text-foreground">{meta.label}</h3>
                  <button
                    type="button"
                    onClick={() => void draftTemplateWithQuill(meta.slot)}
                    className="h-9 rounded-full border border-border px-4 text-primary hover:bg-muted"
                  >
                    Draft with Quill
                  </button>
                </div>
                <p className="mt-1 text-muted-foreground">{meta.hint}</p>
                <textarea
                  value={value}
                  onChange={(event) =>
                    queryClient.setQueryData(["campaign", campaignId], {
                      ...data,
                      [meta.slot]: event.target.value,
                    })
                  }
                  onBlur={(event) =>
                    void updateCampaign(campaignId, { [meta.slot]: event.target.value } as never)
                      .then(refresh)
                      .catch(() => toast.error("Couldn't save that message."))
                  }
                  rows={4}
                  className="mt-3 w-full rounded-lg border border-input bg-background p-3 text-foreground"
                  placeholder="Write it yourself, or let Quill draft it."
                />
                {meta.limit ? (
                  <p
                    className={`mt-1 ${
                      value.length > meta.limit ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {value.length}/{meta.limit} characters
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-foreground">Who's in it</h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPack(false);
                  setShowExport((value) => !value);
                }}
                className="h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground"
              >
                Export to Dripify
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExport(false);
                  setShowPack((value) => !value);
                }}
                className="h-10 rounded-full border border-border px-5 text-foreground hover:bg-muted"
              >
                Send-it-yourself pack
              </button>
            </div>
          </div>

          {showExport ? (
            <button
              type="button"
              onClick={() => setShowTeamPack(true)}
              className="h-10 rounded-full border border-border px-5 text-foreground hover:bg-muted"
            >
              Prepare this for my team
            </button>

            <DripifyWizard
              campaign={data}
              prospects={rows}
              personalised={personalised}
              onClose={() => setShowExport(false)}
            />
          ) : null}

          {showPack ? (
            <div className="paper-panel mt-4 p-5">
              <h3 className="font-display text-xl text-foreground">Send-it-yourself pack</h3>
              <p className="mt-1 text-muted-foreground">
                For blowing through outreach in a spurt, or handing to a VA.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {SLOTS.map((meta) => (
                  <div key={meta.slot} className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        download(
                          `${slugify(data.name)}-${meta.slot}.csv`,
                          vaCsv(vaRows(meta.slot)),
                        )
                      }
                      className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
                    >
                      {meta.label} CSV
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openChecklist(`${data.name} — ${meta.label}`, vaRows(meta.slot))
                      }
                      className="h-9 rounded-full border border-border px-4 text-primary hover:bg-muted"
                    >
                      Checklist
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {rows.map((prospect) => (
              <article key={prospect.id} className="paper-panel p-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-display text-xl text-foreground">{prospect.name}</h3>
                  <span className="text-muted-foreground">
                    {[prospect.title, prospect.company].filter(Boolean).join(" · ")}
                  </span>
                  {!(prospect.linkedin_url ?? "").trim() ? (
                    <span className="rounded-full bg-destructive/10 px-3 py-0.5 text-destructive">
                      No LinkedIn URL
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {SLOTS.map((meta) => {
                    const isEditing =
                      editing?.prospectId === prospect.id && editing.slot === meta.slot;
                    const custom = personalised.get(`${prospect.id}:${meta.slot}`);
                    const text = bodyFor(data, meta.slot, personalised, prospect.id);
                    return (
                      <div key={meta.slot} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            {meta.label}
                            {custom ? " · personalised" : " · using template"}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(isEditing ? null : { prospectId: prospect.id, slot: meta.slot });
                                setDraftBody(text);
                              }}
                              className="text-primary underline underline-offset-4"
                            >
                              {isEditing ? "Cancel" : "Edit"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void personaliseWithQuill(prospect.id, meta.slot)}
                              className="text-primary underline underline-offset-4"
                            >
                              Quill
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <>
                            <textarea
                              value={draftBody}
                              onChange={(event) => setDraftBody(event.target.value)}
                              rows={4}
                              className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-foreground"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void saveCampaignMessage({
                                  campaignId,
                                  prospectId: prospect.id,
                                  slot: meta.slot,
                                  body: draftBody,
                                })
                                  .then(async () => {
                                    setEditing(null);
                                    await refresh();
                                    toast.success("Saved.");
                                  })
                                  .catch(() => toast.error("Couldn't save that."))
                              }
                              className="mt-2 h-9 rounded-full bg-primary px-4 font-medium text-primary-foreground"
                            >
                              Approve & save
                            </button>
                          </>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap text-foreground/80">
                            {text || "Nothing written yet."}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <FollowUpStrip
                    prospect={prospect}
                    briefId={data.brief_id}
                    campaignId={campaignId}
                    onChange={refresh}
                  />
                </div>
              </article>
            ))}
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                This campaign has no list linked, or the list is empty. Build one with Scout on{" "}
                <Link to="/studio/lists" className="text-primary underline underline-offset-4">
                  My lists
                </Link>
                .
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <TeamPack
        open={showTeamPack}
        onOpenChange={setShowTeamPack}
        campaign={data}
        prospects={rows}
        personalised={personalised}
      />
    </main>
  );
}