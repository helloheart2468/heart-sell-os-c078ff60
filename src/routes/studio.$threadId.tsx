import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";

import { ChatWindow } from "@/components/chat-window";
import { startSession } from "@/lib/handoff";
import { useOffers } from "@/lib/offers";
import { AGENTS, isAgentId, type AgentId } from "@/lib/heart-sell";
import { getThread, getThreadMessages, renameThread } from "@/lib/threads";

const HANDOFFS: Record<AgentId, { agent: AgentId; label: string; prompt: string }[]> = {
  guide: [
    {
      agent: "scout",
      label: "Build a list →",
      prompt:
        "Let's turn this into a list. Confirm the exact target profile with me, then find real people who match.",
    },
    {
      agent: "quill",
      label: "Write outreach →",
      prompt: "Help me write the CCRA first message for the people I'm targeting.",
    },
  ],
  sage: [
    {
      agent: "scout",
      label: "Build a list →",
      prompt:
        "My audience audit is done. Read it, tell me which audience to work first, confirm the exact target profile with me, then find real people who match.",
    },
  ],
  scout: [
    {
      agent: "quill",
      label: "Write outreach →",
      prompt:
        "I've got people saved from Scout. Look up my saved contacts, help me choose who to message first, and write the CCRA first message.",
    },
    {
      agent: "ace",
      label: "Prep a call →",
      prompt:
        "I have a call coming up with someone from my list. Look them up and build my prep sheet.",
    },
  ],
  quill: [
    {
      agent: "ace",
      label: "Prep the call →",
      prompt:
        "They replied and we booked a call. Look up what we have on them and build my prep sheet.",
    },
    {
      agent: "scout",
      label: "Find more people →",
      prompt:
        "I need more people to reach out to. Confirm the target profile with me, then search.",
    },
  ],
  ace: [
    {
      agent: "quill",
      label: "Follow up →",
      prompt:
        "The call is done. Help me write the follow-up message in the Heart Sell voice — what I heard, what I'm proposing, and a clear next step.",
    },
  ],
};

export const Route = createFileRoute("/studio/$threadId")({
  head: () => ({
    meta: [
      { title: "Session — Heart Sell OS" },
      { name: "description", content: "A saved Heart Sell working session." },
      { property: "og:title", content: "Session — Heart Sell OS" },
      { property: "og:description", content: "A saved Heart Sell working session." },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/studio/$threadId" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const thread = useQuery({ queryKey: ["thread", threadId], queryFn: () => getThread(threadId) });
  const history = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => getThreadMessages(threadId),
  });

  const pending = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const key = `pending:${threadId}`;
    const value = sessionStorage.getItem(key);
    if (value) sessionStorage.removeItem(key);
    return value ?? undefined;
  }, [threadId]);

  if (thread.isLoading || history.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Opening session…
      </div>
    );
  }

  if (!thread.data) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        This session doesn't exist.
      </div>
    );
  }

  const agent = isAgentId(thread.data.agent) ? thread.data.agent : "sage";
  const config = AGENTS[agent];

  const handoffs = HANDOFFS[agent];
  const offerName =
    offers.find((offer) => offer.id === thread.data?.brief_id)?.name ?? null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `var(--${config.colorVar})` }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg text-foreground">{thread.data.title}</p>
          <p className="uppercase tracking-wider text-muted-foreground">
            {config.name} · {config.role}
            {offerName ? ` · ${offerName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {handoffs.map((handoff) => (
            <button
              key={handoff.agent}
              type="button"
              onClick={async () => {
                try {
                  const nextId = await startSession(
                    handoff.agent,
                    "chat",
                    handoff.prompt,
                    undefined,
                    thread.data?.brief_id ?? undefined,
                  );
                  await navigate({ to: "/studio/$threadId", params: { threadId: nextId } });
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Couldn't hand that off.",
                  );
                }
              }}
              className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
            >
              {handoff.label}
            </button>
          ))}
        </div>
      </header>

      <ChatWindow
        key={threadId}
        threadId={threadId}
        agent={agent}
        briefId={thread.data.brief_id}
        initialMessages={history.data ?? []}
        {...(pending ? { autoSend: pending } : {})}
        onFirstMessage={(text) => {
          if ((history.data ?? []).length > 0) return;
          void renameThread(threadId, `${config.name} · ${text.slice(0, 60)}`).then(() => {
            void queryClient.invalidateQueries({ queryKey: ["threads"] });
            void queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
          });
        }}
      />
    </div>
  );
}
