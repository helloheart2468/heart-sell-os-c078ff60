import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FollowUpStrip } from "@/components/followup-strip";
import { BUCKET_LABELS, bucketFor, formatDue, type Bucket } from "@/lib/followups";
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

  const rows = prospects.data ?? [];
  const grouped = ORDER.map((bucket) => ({
    bucket,
    items: rows.filter((prospect) => bucketFor(prospect) === bucket),
  })).filter((group) => group.items.length > 0);

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
        </div>

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
                    <p className="mt-1 text-muted-foreground">
                      {prospect.last_touch_at
                        ? `Last touch ${formatDue(prospect.last_touch_at)}`
                        : "No touch logged yet"}
                    </p>
                    <div className="mt-4">
                      <FollowUpStrip
                        prospect={prospect}
                        briefId={currentId}
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
