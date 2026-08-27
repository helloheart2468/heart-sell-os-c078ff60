import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { StructuredForm } from "@/components/structured-form";
import { BUSINESS_FIELDS } from "@/lib/heart-sell";
import { getBusinessCore, saveBusinessCore } from "@/lib/threads";

export const Route = createFileRoute("/studio/business")({
  head: () => ({
    meta: [
      { title: "Business core — Heart Sell OS" },
      {
        name: "description",
        content:
          "Your expertise, the problems you solve and your story — the truths that stay the same across every offer.",
      },
      { property: "og:title", content: "Business core — Heart Sell OS" },
      {
        property: "og:description",
        content: "Write it once; every offer's Audience Audit reads from it.",
      },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const queryClient = useQueryClient();
  const core = useQuery({ queryKey: ["business-core"], queryFn: getBusinessCore });

  if (core.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading your business core…
      </div>
    );
  }

  const initial = (core.data ?? {}) as unknown as Record<string, string>;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          True across every offer
        </p>
        <h1 className="mt-3 font-display text-4xl text-foreground">Business core</h1>
        <p className="mt-3 text-muted-foreground">
          Your expertise, the problems you solve, your story, and how you sound — your greeting,
          your sign-off, your booking link and your style, so every draft comes out in your voice.
          Write it once — every offer's
          Audience Audit builds on top of it. Offer-specific things (broken phone, ICP, partners,
          ecosystems, pricing) live in{" "}
          <Link to="/studio/offers" className="text-primary underline-offset-2 hover:underline">
            your offers
          </Link>
          .
        </p>

        <div className="paper-panel mt-9 p-7">
          <StructuredForm
            agent="sage"
            fields={BUSINESS_FIELDS}
            initialValues={initial}
            submitLabel="Save business core"
            onSubmit={async (values) => {
              try {
                await saveBusinessCore(values);
                await queryClient.invalidateQueries({ queryKey: ["business-core"] });
                toast.success("Business core saved.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn't save that.");
              }
            }}
          />
        </div>
      </div>
    </main>
  );
}
