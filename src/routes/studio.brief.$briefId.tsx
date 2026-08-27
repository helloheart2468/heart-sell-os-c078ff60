import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { StructuredForm } from "@/components/structured-form";
import { AGENTS, buildStructuredMessage } from "@/lib/heart-sell";
import { OFFERS_KEY, useOffers } from "@/lib/offers";
import { createThread, getBrief, getBusinessCore, updateBrief } from "@/lib/threads";

export const Route = createFileRoute("/studio/brief/$briefId")({
  head: () => ({
    meta: [
      { title: "Audience Audit — Heart Sell OS" },
      {
        name: "description",
        content:
          "Build the Audience Audit for this offer — the brief that feeds list building, outreach drafting and call prep.",
      },
      { property: "og:title", content: "Audience Audit — Heart Sell OS" },
      {
        property: "og:description",
        content: "One audit per offer, feeding Scout, Quill and Ace.",
      },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentId, setCurrent } = useOffers();

  const brief = useQuery({ queryKey: ["brief", briefId], queryFn: () => getBrief(briefId) });
  const business = useQuery({ queryKey: ["business-core"], queryFn: getBusinessCore });

  if (brief.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading your audit…
      </div>
    );
  }

  if (!brief.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>That offer no longer exists.</p>
        <Link to="/studio/offers" className="text-primary underline-offset-2 hover:underline">
          Back to offers
        </Link>
      </div>
    );
  }

  const initial = brief.data as unknown as Record<string, string>;
  const core = business.data;
  const coreLines = [
    core?.business_summary,
    core?.problems_solved,
    core?.unfair_advantage,
  ].filter(Boolean) as string[];

  const persist = async (values: Record<string, string>) => {
    await updateBrief(briefId, values);
    await queryClient.invalidateQueries({ queryKey: ["brief", briefId] });
    await queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {AGENTS.sage.chapters}
        </p>
        <h1 className="mt-3 font-display text-4xl text-foreground">
          {initial["name"] || "Untitled offer"}
        </h1>
        <p className="mt-3 text-muted-foreground">{AGENTS.sage.structuredIntro}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {currentId === briefId ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              Current offer
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void setCurrent(briefId)}
              className="h-9 rounded-full border border-border px-4 text-sm hover:bg-muted"
            >
              Make this my current offer
            </button>
          )}
          <Link
            to="/studio/offers"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            All offers
          </Link>
        </div>

        <section className="paper-panel mt-8 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl text-foreground">Business core</h2>
            <Link
              to="/studio/business"
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              Edit
            </Link>
          </div>
          {coreLines.length ? (
            <ul className="mt-3 space-y-2 text-foreground/80">
              {coreLines.map((line) => (
                <li key={line} className="line-clamp-2">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted-foreground">
              You haven't written your business core yet — your expertise and story that stay true
              across every offer.
            </p>
          )}
        </section>

        <div className="paper-panel mt-6 p-7">
          <StructuredForm
            agent="sage"
            initialValues={initial}
            submitLabel="Save & have Sage finish it"
            onSubmit={async (values) => {
              try {
                await persist(values);
                const threadId = await createThread(
                  "sage",
                  "structured",
                  `Sage · ${values["name"] || "Audience Audit"}`,
                  briefId,
                );
                sessionStorage.setItem(
                  `pending:${threadId}`,
                  buildStructuredMessage("sage", values),
                );
                await navigate({ to: "/studio/$threadId", params: { threadId } });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn't save the audit.");
              }
            }}
            secondaryAction={{
              label: "Save only",
              onClick: async (values) => {
                try {
                  await persist(values);
                  toast.success("Audit saved for this offer.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Couldn't save the audit.");
                }
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
