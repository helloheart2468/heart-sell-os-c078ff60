import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { listProspects } from "@/lib/prospects";
import { OFFERS_KEY, useOffers } from "@/lib/offers";
import { archiveBrief, createBrief, deleteBrief, duplicateBrief } from "@/lib/threads";

export const Route = createFileRoute("/studio/offers")({
  head: () => ({
    meta: [
      { title: "Your offers — Heart Sell OS" },
      {
        name: "description",
        content:
          "One Audience Audit per offer. Switch offers to keep lists, outreach and call prep separate.",
      },
      { property: "og:title", content: "Your offers — Heart Sell OS" },
      {
        property: "og:description",
        content: "Multiple offers, one business — each with its own audit and lists.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { offers, currentId, setCurrent, refresh } = useOffers();
  const prospects = useQuery({ queryKey: ["prospects", "all"], queryFn: () => listProspects() });

  const countFor = (briefId: string) =>
    (prospects.data ?? []).filter((prospect) => prospect.brief_id === briefId).length;

  const after = async () => {
    await refresh();
    await queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl text-foreground">Your offers</h1>
        <p className="mt-3 text-muted-foreground">
          Each offer gets its own Audience Audit, its own lists and its own outreach. Your{" "}
          <Link to="/studio/business" className="text-primary underline-offset-2 hover:underline">
            business core
          </Link>{" "}
          stays shared across all of them.
        </p>

        <button
          type="button"
          onClick={async () => {
            try {
              const id = await createBrief({ name: "New offer" });
              await after();
              await navigate({ to: "/studio/brief/$briefId", params: { briefId: id } });
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Couldn't add that offer.");
            }
          }}
          className="mt-7 h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Add an offer
        </button>

        <ul className="mt-8 space-y-4">
          {offers.length === 0 ? (
            <li className="paper-panel p-6 text-muted-foreground">
              No offers yet — add one to start your first Audience Audit.
            </li>
          ) : null}

          {offers.map((offer) => {
            const isCurrent = offer.id === currentId;
            return (
              <li key={offer.id} className="paper-panel p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl text-foreground">
                    {offer.name || "Untitled offer"}
                  </h2>
                  {isCurrent ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                      <Check className="h-4 w-4" /> Current
                    </span>
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {countFor(offer.id)} saved {countFor(offer.id) === 1 ? "person" : "people"}
                  </span>
                </div>

                {offer["icp_description"] ? (
                  <p className="mt-2 line-clamp-2 text-foreground/80">{offer["icp_description"]}</p>
                ) : (
                  <p className="mt-2 text-muted-foreground">Audit not started yet.</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/studio/brief/$briefId"
                    params={{ briefId: offer.id }}
                    className="flex h-9 items-center rounded-full border border-border px-4 text-sm hover:bg-muted"
                  >
                    Open audit
                  </Link>
                  {!isCurrent ? (
                    <button
                      type="button"
                      onClick={() => void setCurrent(offer.id)}
                      className="h-9 rounded-full border border-border px-4 text-sm hover:bg-muted"
                    >
                      Switch to this offer
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await duplicateBrief(offer.id);
                        await after();
                        toast.success("Offer duplicated.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Couldn't duplicate that.",
                        );
                      }
                    }}
                    className="h-9 rounded-full border border-border px-4 text-sm hover:bg-muted"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await archiveBrief(offer.id);
                        if (isCurrent) {
                          const next = offers.find((other) => other.id !== offer.id);
                          await setCurrent(next?.id ?? null);
                        }
                        await after();
                        toast.success("Offer archived. Its work is still saved.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Couldn't archive that.",
                        );
                      }
                    }}
                    className="h-9 rounded-full border border-border px-4 text-sm hover:bg-muted"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Delete this offer? Its audit is removed; saved people and chats stay but lose their offer tag.",
                        )
                      )
                        return;
                      try {
                        await deleteBrief(offer.id);
                        if (isCurrent) {
                          const next = offers.find((other) => other.id !== offer.id);
                          await setCurrent(next?.id ?? null);
                        }
                        await after();
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Couldn't delete that.",
                        );
                      }
                    }}
                    className="h-9 rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
