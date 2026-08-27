import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FollowUpStrip } from "@/components/followup-strip";
import {
  bodyFor,
  listCampaignMessages,
  listCampaigns,
  type CampaignSlot,
} from "@/lib/campaigns";
import { download, openChecklist, vaCsv, type VaRow } from "@/lib/exports";
import { BUCKET_LABELS, bucketFor, dueNow, formatDue, type Bucket } from "@/lib/followups";
import { useOffers } from "@/lib/offers";
import { listProspects } from "@/lib/prospects";


const ORDER: Bucket[] = ["overdue", "today", "week", "waiting", "booked"];

export const Route = createFileRoute("/studio/followups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Heart Sell OS" },
      {
        name: "description",
        content:
          "Every outreach touch that's due today, overdue or waiting on a reply — with one tap to log what happened.",
      },
      { property: "og:title", content: "Follow-ups — Heart Sell OS" },
      {
        property: "og:description",
        content: "One place to log what you sent and let Quill and Ace pick up the next step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const queryClient = useQueryClient();
  const { currentId, currentOffer, offers } = useOffers();
  const [allOffers, setAllOffers] = useState(false);
  const scope = allOffers ? null : currentId;

  const prospects = useQuery({
    queryKey: ["prospects", "followups", scope ?? "all"],
    queryFn: () => listProspects(undefined, scope),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["prospects"] });
  };

  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const campaigns = useQuery({
    queryKey: ["campaigns", scope ?? "all"],
    queryFn: () => listCampaigns(scope),
  });
  const campaignMessages = useQuery({
    queryKey: ["campaign-messages", "all", (campaigns.data ?? []).map((c) => c.id).join(",")],
    queryFn: async () => {
      const lists = await Promise.all(
        (campaigns.data ?? []).map((campaign) => listCampaignMessages(campaign.id)),
      );
      return lists.flat();
    },
    enabled: (campaigns.data ?? []).length > 0,
  });

  const campaignFor = (prospect: { campaign_id: string | null; list_id: string | null }) =>
    (campaigns.data ?? []).find(
      (entry) =>
        (prospect.campaign_id && entry.id === prospect.campaign_id) ||
        (!prospect.campaign_id && entry.list_id && entry.list_id === prospect.list_id),
    ) ?? null;

  const all = prospects.data ?? [];
  const rows =
    campaignFilter === "all"
      ? all
      : all.filter((prospect) => {
          const campaign = campaignFor(prospect);
          return campaignFilter === "none" ? !campaign : campaign?.id === campaignFilter;
        });
  const grouped = ORDER.map((bucket) => ({
    bucket,
    items: rows.filter((prospect) => bucketFor(prospect) === bucket),
  })).filter((group) => group.items.length > 0);

  const personalised = new Map<string, string>();
  for (const message of campaignMessages.data ?? []) {
    personalised.set(`${message.prospect_id}:${message.slot}`, message.body);
  }

  /** The message they owe this person next, pulled from whichever campaign covers their list. */
  const dueRows: VaRow[] = dueNow(rows).map((prospect) => {
    const campaign = campaignFor(prospect);
    const step = Math.min((prospect.sequence_step ?? 0) + 1, 3);
    const slot: CampaignSlot =
      step === 1 ? "connection_note" : step === 2 ? "message_1" : "message_2";
    return {
      prospect,
      message: campaign ? bodyFor(campaign, slot, personalised, prospect.id) : "",
      channel: campaign?.channel === "email" ? "Email" : "LinkedIn",
      campaignName: campaign?.name ?? "No campaign",
    };
  });


  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl text-foreground">Follow-ups</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Log what you sent in one tap. The 7-Day Sales Path sets the next date, Quill drafts the
          message, and Ace steps in the moment a call is booked.
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
          {dueRows.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => download("outreach-due.csv", vaCsv(dueRows))}
                className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
              >
                Export everything due (CSV)
              </button>
              <button
                type="button"
                onClick={() => openChecklist("Outreach due", dueRows)}
                className="h-9 rounded-full border border-border px-4 text-primary hover:bg-muted"
              >
                Printable checklist
              </button>
            </>
          ) : null}
        </div>

        {(campaigns.data ?? []).length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label htmlFor="followup-campaign" className="text-muted-foreground">
              Filter by campaign
            </label>
            <select
              id="followup-campaign"
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
          <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Nothing waiting on you. Log a "Sent" on anyone in{" "}
            <span className="text-foreground">My lists</span> and they'll appear here.
          </div>
        ) : null}

        <div className="mt-8 space-y-10">
          {grouped.map((group) => (
            <section key={group.bucket}>
              <h2 className="font-display text-2xl text-foreground">
                {BUCKET_LABELS[group.bucket]}{" "}
                <span className="text-muted-foreground">({group.items.length})</span>
              </h2>
              <div className="mt-4 space-y-3">
                {group.items.map((prospect) => (
                  <article key={prospect.id} className="paper-panel p-5">
                    <h3 className="font-display text-xl text-foreground">{prospect.name}</h3>
                    <p className="text-muted-foreground">
                      {[prospect.title, prospect.company].filter(Boolean).join(" · ")}
                    </p>
                    {campaignFor(prospect) ? (
                      <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-primary">
                        {campaignFor(prospect)!.name}
                        {prospect.campaign_slot
                          ? ` · ${
                              prospect.campaign_slot === "connection_note"
                                ? "Connection note"
                                : prospect.campaign_slot === "message_1"
                                  ? "Message 1"
                                  : "Follow-up"
                            }`
                          : ""}
                      </span>
                    ) : null}
                    <p className="mt-1 text-muted-foreground">
                      {prospect.last_touch_at
                        ? `Last touch ${formatDue(prospect.last_touch_at)}`
                        : "No touch logged yet"}
                    </p>
                    <div className="mt-4">
                      <FollowUpStrip
                        prospect={prospect}
                        briefId={currentId}
                        campaignId={campaignFor(prospect)?.id ?? null}
                        onChange={refresh}
                      />
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
