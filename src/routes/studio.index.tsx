import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { StructuredForm } from "@/components/structured-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AGENT_LIST, AGENTS, buildStructuredMessage, type AgentId } from "@/lib/heart-sell";
import { useOffers } from "@/lib/offers";
import { createThread } from "@/lib/threads";

export const Route = createFileRoute("/studio/")({
  head: () => ({
    meta: [
      { title: "Studio — Heart Sell OS" },
      {
        name: "description",
        content: "Choose Sage, Scout, Quill or Ace and start a structured or conversational session.",
      },
      { property: "og:title", content: "Studio — Heart Sell OS" },
      {
        property: "og:description",
        content: "Choose Sage, Scout, Quill or Ace and start a structured or conversational session.",
      },
    ],
  }),
  component: StudioHome,
});

function StudioHome() {
  const navigate = useNavigate();
  const [openAgent, setOpenAgent] = useState<AgentId | null>(null);
  const [openChat, setOpenChat] = useState("");
  const { offers, currentId, currentOffer, setCurrent } = useOffers();

  const start = async (agent: AgentId, mode: "chat" | "structured", prompt?: string, title?: string) => {
    try {
      const threadId = await createThread(agent, mode, title, currentId);
      if (prompt) sessionStorage.setItem(`pending:${threadId}`, prompt);
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start that session.");
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-6 py-14">
        <h1 className="font-display text-4xl text-foreground">Where are we working today?</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Every guide runs the Heart Sell method as written. Take the structured path for a form, or
          just start talking.
        </p>

        {brief.data ? (
          <p className="mt-6 text-muted-foreground">
            Your Audience Audit is active and feeding every guide.{" "}
            <Link to="/studio/brief" className="underline underline-offset-4 hover:text-foreground">
              Review or update it
            </Link>
            .
          </p>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-muted-foreground">
            No Audience Audit yet. Start with Sage —{" "}
            <Link to="/studio/brief" className="underline underline-offset-4 hover:text-foreground">
              fill the brief
            </Link>{" "}
            and Scout, Quill and Ace will read from it automatically.
          </div>
        )}

        <form
          className="paper-panel mt-8 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const value = openChat.trim();
            if (!value) return;
            setOpenChat("");
            void start("guide", "chat", value, value.slice(0, 90));
          }}
        >
          <label htmlFor="open-chat" className="text-sm text-muted-foreground">
            Or just start talking — the guide will point you to the right person.
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="open-chat"
              value={openChat}
              onChange={(event) => setOpenChat(event.target.value)}
              placeholder="What are we working on today?"
              className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-foreground outline-none focus:border-foreground/40"
            />
            <button
              type="submit"
              className="h-11 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start open chat
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/studio/path"
            className="flex h-10 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Run the full path
          </Link>
          <Link
            to="/studio/lists"
            className="flex h-10 items-center rounded-full border border-border px-5 text-foreground hover:bg-muted"
          >
            My lists
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {AGENT_LIST.map((agent) => (
            <article key={agent.id} className="paper-panel flex flex-col p-6">
              <span
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: `var(--${agent.colorVar})` }}
              />
              <h2 className="mt-4 font-display text-2xl text-foreground">{agent.name}</h2>
              <p className="font-medium text-muted-foreground">{agent.role}</p>
              <p className="mt-3 flex-1 leading-relaxed text-foreground/80">{agent.tagline}</p>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    agent.id === "sage"
                      ? navigate({ to: "/studio/brief" })
                      : setOpenAgent(agent.id)
                  }
                  className="h-9 flex-1 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {agent.structuredTitle}
                </button>
                <button
                  type="button"
                  onClick={() => start(agent.id, "chat")}
                  className="h-9 flex-1 rounded-full border border-border text-sm text-foreground transition-colors hover:bg-accent"
                >
                  Just talk
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={openAgent !== null} onOpenChange={(open) => !open && setOpenAgent(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {openAgent ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {AGENTS[openAgent].structuredTitle}
                </DialogTitle>
                <DialogDescription>{AGENTS[openAgent].structuredIntro}</DialogDescription>
              </DialogHeader>
              <StructuredForm
                agent={openAgent}
                submitLabel={`Send to ${AGENTS[openAgent].name}`}
                onSubmit={async (values) => {
                  const agent = openAgent;
                  const title =
                    values["contact"] || values["market"] || `${AGENTS[agent].structuredTitle}`;
                  setOpenAgent(null);
                  await start(
                    agent,
                    "structured",
                    buildStructuredMessage(agent, values),
                    `${AGENTS[agent].name} · ${title}`,
                  );
                }}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
