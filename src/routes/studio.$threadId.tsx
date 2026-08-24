import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { ChatWindow } from "@/components/chat-window";
import { AGENTS, isAgentId } from "@/lib/heart-sell";
import { getThread, getThreadMessages, renameThread } from "@/lib/threads";

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `var(--${config.colorVar})` }}
        />
        <div className="min-w-0">
          <p className="truncate font-display text-lg text-foreground">{thread.data.title}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {config.name} · {config.role}
          </p>
        </div>
      </header>

      <ChatWindow
        key={threadId}
        threadId={threadId}
        agent={agent}
        initialMessages={history.data ?? []}
        autoSend={pending}
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
