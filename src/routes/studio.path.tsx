import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { startSession } from "@/lib/handoff";
import { listProspects } from "@/lib/prospects";
import { useOffers } from "@/lib/offers";

export const Route = createFileRoute("/studio/path")({
  head: () => ({
    meta: [
      { title: "Guided path — Heart Sell OS" },
      {
        name: "description",
        content:
          "Run the full Heart Sell path in order: audience audit with Sage, lists with Scout, outreach with Quill, call prep with Ace.",
      },
      { property: "og:title", content: "Guided path — Heart Sell OS" },
      {
        property: "og:description",
        content: "Sage to Scout to Quill to Ace, in the order Dora teaches it.",
      },
    ],
  }),
  component: GuidedPath,
});

function GuidedPath() {
  const navigate = useNavigate();
  const { currentId, currentOffer } = useOffers();
  const prospects = useQuery({
    queryKey: ["prospects", currentId ?? "all"],
    queryFn: () => listProspects(undefined, currentId),
  });

  const hasBrief = Boolean(currentOffer?.icp_description || currentOffer?.broken_phone);
  const hasProspects = (prospects.data?.length ?? 0) > 0;

  const go = async (
    agent: "scout" | "quill" | "ace",
    prompt: string,
  ) => {
    try {
      const threadId = await startSession(agent, "chat", prompt, undefined, currentId);
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start that step.");
    }
  };

  const steps = [
    {
      n: 1,
      name: "Sage · Audience Audit",
      done: hasBrief,
      body: hasBrief
        ? "Your audit is saved and feeding every other guide. Update it whenever your offer shifts."
        : "Name your expertise, your broken phone, and your three outbound audiences. Everything downstream reads from this.",
      action: hasBrief ? "Review the audit" : "Start the audit",
      run: () => navigate({ to: "/studio/brief" }),
    },
    {
      n: 2,
      name: "Scout · Build the list",
      done: hasProspects,
      body: "Pick one audience — ideal clients, partners, or ecosystem — then let Scout search the live web and save the people you like.",
      action: hasProspects ? "Find more people" : "Find people",
      run: () =>
        go(
          "scout",
          hasBrief
            ? "Let's build a list. Read my audience audit, suggest the single audience I should work first, confirm the exact target profile with me, then search."
            : "I don't have an audit yet. Help me define a target profile from scratch, confirm it with me, then find real people who match.",
        ),
    },
    {
      n: 3,
      name: "Quill · Write the outreach",
      done: false,
      body: "Turn saved people into CCRA first messages — commonality, compliment, reason, ask — in your voice.",
      action: "Draft outreach",
      run: () =>
        go(
          "quill",
          "I'm ready to write outreach for people on my saved list. Look up who I have saved, help me pick who to message first, and write the CCRA first message.",
        ),
    },
    {
      n: 4,
      name: "Ace · Prep the call",
      done: false,
      body: "When someone says yes, Ace builds the 7-step conversation prep from what you already know about them.",
      action: "Prep a call",
      run: () =>
        go("ace", "I have a call booked. Look up what we have on them and build my prep sheet."),
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        <h1 className="font-display text-4xl text-foreground">The full path</h1>
        <p className="mt-2 text-muted-foreground">
          For <span className="text-foreground">{currentOffer?.name || "your offer"}</span>. Switch
          offers in the sidebar to run the path for a different one.
        </p>
        <p className="mt-3 text-muted-foreground">
          Four steps, in the order Dora teaches them. You can jump out to open chat at any point —
          nothing here locks you in.
        </p>

        <ol className="mt-10 space-y-4">
          {steps.map((step) => (
            <li key={step.n} className="paper-panel flex gap-4 p-6">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-medium ${
                  step.done
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {step.done ? <Check className="h-4 w-4" /> : step.n}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl text-foreground">{step.name}</h2>
                <p className="mt-2 text-foreground/80">{step.body}</p>
                <button
                  type="button"
                  onClick={() => void step.run()}
                  className="mt-4 h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {step.action}
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
