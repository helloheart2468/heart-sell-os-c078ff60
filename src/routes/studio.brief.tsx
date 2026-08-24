import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { StructuredForm } from "@/components/structured-form";
import { AGENTS, buildStructuredMessage } from "@/lib/heart-sell";
import { createThread, getActiveBrief, saveBrief } from "@/lib/threads";

export const Route = createFileRoute("/studio/brief")({
  head: () => ({
    meta: [
      { title: "Audience Audit — Heart Sell OS" },
      {
        name: "description",
        content:
          "Build the Audience Audit brief that feeds list building, outreach drafting and call prep.",
      },
      { property: "og:title", content: "Audience Audit — Heart Sell OS" },
      {
        property: "og:description",
        content: "The foundation brief every Heart Sell guide reads from.",
      },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const brief = useQuery({ queryKey: ["brief"], queryFn: getActiveBrief });

  if (brief.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading your brief…
      </div>
    );
  }

  const initial = (brief.data ?? {}) as Record<string, string>;

  const persist = async (values: Record<string, string>) => {
    await saveBrief(values, brief.data?.id);
    await queryClient.invalidateQueries({ queryKey: ["brief"] });
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {AGENTS.sage.chapters}
        </p>
        <h1 className="mt-3 font-display text-4xl text-foreground">
          {AGENTS.sage.structuredTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{AGENTS.sage.structuredIntro}</p>

        <div className="paper-panel mt-9 p-7">
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
                  "Sage · Audience Audit review",
                );
                sessionStorage.setItem(
                  `pending:${threadId}`,
                  buildStructuredMessage("sage", values),
                );
                await navigate({ to: "/studio/$threadId", params: { threadId } });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn't save the brief.");
              }
            }}
            secondaryAction={{
              label: "Save only",
              onClick: async (values) => {
                try {
                  await persist(values);
                  toast.success("Brief saved. Scout, Quill and Ace will use it.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Couldn't save the brief.");
                }
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
