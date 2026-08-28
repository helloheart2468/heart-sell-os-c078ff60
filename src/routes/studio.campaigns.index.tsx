import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  CHANNELS,
  channelLabel,
  createCampaign,
  deleteCampaign,
  listCampaigns,
  PURPOSES,
  WARMTHS,
  type CampaignPurpose,
} from "@/lib/campaigns";
import { useOffers } from "@/lib/offers";
import { listProspectLists } from "@/lib/prospects";

export const Route = createFileRoute("/studio/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaigns — Heart Sell OS" },
      {
        name: "description",
        content:
          "Wrap a prospect list in one Heart Sell message sequence, draft it with Quill, and export it straight to Dripify or a VA.",
      },
      { property: "og:title", content: "Campaigns — Heart Sell OS" },
      {
        property: "og:description",
        content: "One list, one sequence, one export. Outreach you can actually run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentId } = useOffers();
  const [name, setName] = useState("");
  const [listId, setListId] = useState("");
  const [channel, setChannel] = useState("linkedin");
  const [warmth, setWarmth] = useState("cold");
  const [purpose, setPurpose] = useState<CampaignPurpose>("evergreen");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventFormat, setEventFormat] = useState("");
  const [eventLink, setEventLink] = useState("");

  const campaigns = useQuery({
    queryKey: ["campaigns", currentId ?? "all"],
    queryFn: () => listCampaigns(currentId),
  });
  const lists = useQuery({
    queryKey: ["prospect-lists", currentId ?? "all"],
    queryFn: () => listProspectLists(currentId),
  });

  const create = useMutation({
    mutationFn: () =>
      createCampaign({
        name: name.trim(),
        listId: listId || null,
        briefId: currentId,
        channel,
        warmth,
        purpose,
        eventName: eventName.trim() || null,
        eventDate: eventDate.trim() || null,
        eventFormat: eventFormat.trim() || null,
        eventLink: eventLink.trim() || null,
      }),
    onSuccess: async (campaign) => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await navigate({ to: "/studio/campaigns/$campaignId", params: { campaignId: campaign.id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't create that campaign."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const listName = (id: string | null) =>
    lists.data?.find((entry) => entry.id === id)?.name ?? "No list linked";

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl text-foreground">Campaigns</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A campaign wraps one list in one sequence: connection note, the message once they connect,
          and the follow-up. Quill drafts them, then you export to Dripify or hand a checklist to
          whoever is sending.
        </p>

        <section className="paper-panel mt-8 p-5">
          <h2 className="font-display text-2xl text-foreground">New campaign</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1.5fr_1fr_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Campaign name"
              aria-label="Campaign name"
              className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
            />
            <select
              value={listId}
              onChange={(event) => setListId(event.target.value)}
              aria-label="List"
              className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
            >
              <option value="">Pick a list…</option>
              {(lists.data ?? []).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              aria-label="Channel"
              className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
            >
              {CHANNELS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
              className="h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground disabled:opacity-40"
            >
              Create
            </button>
          </div>
          <p className="mt-2 text-muted-foreground">
            {CHANNELS.find((entry) => entry.value === channel)?.hint}
          </p>
          <div className="mt-4">
            <p className="text-muted-foreground">How well do these people know you?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WARMTHS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setWarmth(entry.value)}
                  className={`rounded-full border px-4 py-2 text-left ${
                    warmth === entry.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-muted-foreground">
              {WARMTHS.find((entry) => entry.value === warmth)?.hint}
            </p>
          </div>
          <div className="mt-4">
            <p className="text-muted-foreground">What is this campaign for?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PURPOSES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setPurpose(entry.value)}
                  title={entry.hint}
                  className={`h-9 rounded-full border px-4 ${
                    purpose === entry.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-muted-foreground">
              {PURPOSES.find((entry) => entry.value === purpose)?.hint}
            </p>
          </div>

          {purpose === "event" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                placeholder="Event or workshop name"
                aria-label="Event name"
                className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
              />
              <input
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                placeholder="When is it? e.g. 14 October, 2pm ET"
                aria-label="Event date"
                className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
              />
              <input
                value={eventFormat}
                onChange={(event) => setEventFormat(event.target.value)}
                placeholder="Format — live workshop, webinar, dinner…"
                aria-label="Event format"
                className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
              />
              <input
                value={eventLink}
                onChange={(event) => setEventLink(event.target.value)}
                placeholder="Registration link (optional)"
                aria-label="Event link"
                className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
              />
            </div>
          ) : null}

          {(lists.data ?? []).length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              No lists yet — build one with Scout on{" "}
              <Link to="/studio/lists" className="text-primary underline underline-offset-4">
                My lists
              </Link>
              .
            </p>
          ) : null}
        </section>

        <div className="mt-8 space-y-3">
          {(campaigns.data ?? []).map((campaign) => (
            <article key={campaign.id} className="paper-panel flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <Link
                  to="/studio/campaigns/$campaignId"
                  params={{ campaignId: campaign.id }}
                  className="font-display text-2xl text-foreground hover:text-primary"
                >
                  {campaign.name}
                </Link>
                <p className="text-muted-foreground">
                  {listName(campaign.list_id)} ·{" "}
                  {channelLabel(campaign.channel)}{campaign.warmth === "warm" ? " · warm" : " · cold"}
                  {campaign.purpose && campaign.purpose !== "evergreen"
                    ? ` · ${PURPOSES.find((entry) => entry.value === campaign.purpose)?.label ?? campaign.purpose}`
                    : ""}
                  {campaign.event_name ? ` · ${campaign.event_name}` : ""}
                </p>
              </div>
              <Link
                to="/studio/campaigns/$campaignId"
                params={{ campaignId: campaign.id }}
                className="btn-soft flex h-9 items-center rounded-full px-4 font-medium"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => remove.mutate(campaign.id)}
                className="h-9 rounded-full border border-border px-4 text-muted-foreground hover:bg-muted"
              >
                Delete
              </button>
            </article>
          ))}
          {campaigns.data && campaigns.data.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              No campaigns yet. Pick a list above and Quill will help you write the sequence.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
