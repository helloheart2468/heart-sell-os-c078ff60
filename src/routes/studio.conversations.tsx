import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FollowUpStrip } from "@/components/followup-strip";
import { listCampaigns } from "@/lib/campaigns";
import { prepCall, touchHistory } from "@/lib/followup-handoff";
import { formatDue } from "@/lib/followups";
import { useOffers } from "@/lib/offers";
import { listProspects, type Prospect } from "@/lib/prospects";

export const Route = createFileRoute("/studio/conversations")({
  head: () => ({
    meta: [
      { title: "Conversations — Heart Sell OS" },
      {
        name: "description",
        content:
          "Everyone who replied or booked a call, with the touch history and one tap into Ace for call prep.",
      },
      { property: "og:title", content: "Conversations — Heart Sell OS" },
      {
        property: "og:description",
        content: "The human half of your outreach: replies, calls booked and what to say next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConversationsPage,
});

type Group = { key: string; label: string; match: (prospect: Prospect) => boolean };

const GROUPS: Group[] = [
  {
    key: "booked",
    label: "Calls booked",
    match: (prospect) => prospect.follow_up_state === "booked",
  },
  {
    key: "interested",
    label: "Replied and interested",
    match: (prospect) =>
      prospect.status === "replied" && prospect.next_action_kind === "book_call",
  },
  {
    key: "talking",
    label: "In conversation",
    match: (prospect) =>
      prospect.status === "replied" &&
      prospect.follow_up_state !== "booked" &&
      prospect.next_action_kind !== "book_call" &&
      prospect.follow_up_state !== "closed" &&
      prospect.next_action_kind !== "gentle_recheck",
  },
  {
    key: "not_now",
    label: "Not now",
    match: (prospect) =>
      prospect.next_action_kind === "gentle_recheck" ||
      (prospect.status === "replied" && prospect.follow_up_state === "closed"),
  },
];

function History({ prospectId }: { prospectId: string }) {
  const [text, setText] = useState("Loading history…");
  useEffect(() => {
    let active = true;
    void touchHistory(prospectId).then((value) => {
      if (active) setText(value);
    });
    return () => {
      active = false;
    };
  }, [prospectId]);
  return <pre className="mt-2 whitespace-pre-wrap font-body text-muted-foreground">{text}</pre>;
}

function stepName(slot: string): string {
  if (slot === "connection_note") return "Connection note";
  if (slot === "message_1") return "Message 1";
  if (slot === "message_2") return "Follow-up";
  return slot;
}

function ConversationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentId } = useOffers();

  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  const prospects = useQuery({
    queryKey: ["prospects", "conversations", currentId ?? "all"],
    queryFn: () => listProspects(undefined, currentId),
  });
  const campaigns = useQuery({
    queryKey: ["campaigns", currentId ?? "all"],
    queryFn: () => listCampaigns(currentId),
  });
  const campaignName = (id: string | null) =>
    (campaigns.data ?? []).find((entry) => entry.id === id)?.name ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["prospects"] });
  };

  const all = prospects.data ?? [];
  const rows =
    campaignFilter === "all"
      ? all
      : all.filter((prospect) =>
          campaignFilter === "none"
            ? !prospect.campaign_id
            : prospect.campaign_id === campaignFilter,
        );
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: rows.filter(group.match),
  })).filter((group) => group.items.length > 0);

  const openAce = async (prospect: Prospect) => {
    try {
      const threadId = await prepCall(prospect, currentId);
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open Ace.");
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl text-foreground">Conversations</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Once someone answers, they live here. Ace reads the whole history — what you sent, what
          they said — and builds the 7-Step Conversation prep from what actually happened.
        </p>

        {(campaigns.data ?? []).length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label htmlFor="campaign-filter" className="text-muted-foreground">
              Filter by campaign
            </label>
            <select
              id="campaign-filter"
              value={campaignFilter}
              onChange={(event) => setCampaignFilter(event.target.value)}
              className="h-10 rounded-full border border-input bg-background px-4 text-foreground"
            >
              <option value="all">All campaigns</option>
              {(campaigns.data ?? []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
              <option value="none">Not in a campaign</option>
            </select>
          </div>
        ) : null}

        {grouped.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No conversations yet. Log a reply or a booked call on anyone in your lists and they'll
            appear here.
          </p>
        ) : null}

        <div className="mt-8 space-y-10">
          {grouped.map((group) => (
            <section key={group.key}>
              <h2 className="font-display text-2xl text-foreground">
                {group.label} <span className="text-muted-foreground">({group.items.length})</span>
              </h2>
              <div className="mt-4 space-y-3">
                {group.items.map((prospect) => (
                  <article key={prospect.id} className="paper-panel p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl text-foreground">{prospect.name}</h3>
                        <p className="text-muted-foreground">
                          {[prospect.title, prospect.company].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {campaignName(prospect.campaign_id) ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                            {campaignName(prospect.campaign_id)}
                            {prospect.campaign_slot
                              ? ` · ${stepName(prospect.campaign_slot)}`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                      {prospect.call_at ? (
                        <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                          Call {formatDue(prospect.call_at)}
                        </span>
                      ) : null}
                    </div>

                    <History prospectId={prospect.id} />

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => void openAce(prospect)}
                        className="h-9 rounded-full bg-primary px-4 font-medium text-primary-foreground"
                      >
                        Prep the call with Ace
                      </button>
                    </div>

                    <div className="mt-4">
                      <FollowUpStrip prospect={prospect} briefId={currentId} onChange={refresh} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
