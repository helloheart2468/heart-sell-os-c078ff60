import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ChevronRight, Pencil, Pin, PinOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import mark from "@/assets/heart-sell-mark.png";
import { AgentNudges } from "@/components/agent-nudges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AGENTS, isAgentId } from "@/lib/heart-sell";
import { dueNow } from "@/lib/followups";
import { useOffers } from "@/lib/offers";
import { listProspects } from "@/lib/prospects";
import { listTodos } from "@/lib/todos";

import {
  listThreads,
  renameThread,
  setThreadArchived,
  setThreadPinned,
} from "@/lib/threads";

const GROUP_ORDER = ["guide", "sage", "scout", "quill", "ace", "other"] as const;

export const Route = createFileRoute("/studio")({
  component: StudioLayout,
});

function StudioLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { offers, currentId, setCurrent } = useOffers();
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const threads = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: listThreads,
    enabled: Boolean(user),
  });

  const todos = useQuery({
    queryKey: ["todos", currentId ?? "all"],
    queryFn: () => listTodos(currentId),
    enabled: Boolean(user),
  });
  const openTodoCount = (todos.data ?? []).filter((todo) => !todo.is_done).length;

  const followUps = useQuery({
    queryKey: ["prospects", "followups", currentId ?? "all"],
    queryFn: () => listProspects(undefined, currentId),
    enabled: Boolean(user),
  });
  const dueCount = dueNow(followUps.data ?? []).length;


  const mutate = async (action: Promise<unknown>) => {
    try {
      await action;
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update that session.");
    }
  };

  const commitRename = async (threadId: string, title: string) => {
    setRenamingId(null);
    const next = title.trim();
    if (!next) return;
    await mutate(renameThread(threadId, next));
    await queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
  };

  const visibleThreads = (threads.data ?? []).filter(
    (thread) =>
      Boolean(thread.is_archived) === showArchived &&
      (showAllOffers || !currentId || !thread.brief_id || thread.brief_id === currentId),
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src={mark} alt="" className="h-7 w-7" />
          <Link to="/studio" className="font-display text-base text-sidebar-foreground">
            Heart Sell OS
          </Link>
        </div>

        <div className="px-5 pb-1">
          <label
            htmlFor="offer-switcher"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Current offer
          </label>
          <select
            id="offer-switcher"
            value={currentId ?? ""}
            onChange={(event) => void setCurrent(event.target.value || null)}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-sidebar-foreground"
          >
            {offers.length === 0 ? <option value="">No offers yet</option> : null}
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name || "Untitled offer"}
              </option>
            ))}
          </select>
          <Link
            to="/studio/offers"
            className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Manage offers
          </Link>
        </div>

        <div className="px-5 pt-3">
          <Link
            to="/studio"
            className="flex h-9 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
          >
            New session
          </Link>
          <Link
            to="/studio/path"
            className="mt-2 flex h-9 w-full items-center justify-center rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Guided path
          </Link>
          <Link
            to="/studio/brief"
            className="mt-2 flex h-9 w-full items-center justify-center rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Audience Audit
          </Link>
          <Link
            to="/studio/business"
            className="mt-2 flex h-9 w-full items-center justify-center rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Business core
          </Link>
          <Link
            to="/studio/lists"
            className="mt-2 flex h-9 w-full items-center justify-center rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            My lists
          </Link>
          <Link
            to="/studio/followups"
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            Follow-ups
            {dueCount > 0 ? (
              <span className="rounded-full bg-primary px-2 text-sm text-primary-foreground">
                {dueCount}
              </span>
            ) : null}
          </Link>
          <Link
            to="/studio/todos"
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            My to-dos
            {openTodoCount > 0 ? (
              <span className="rounded-full bg-primary px-2 text-sm text-primary-foreground">
                {openTodoCount}
              </span>
            ) : null}
          </Link>

        </div>

        <div className="flex items-center justify-between px-5 pb-2 pt-7">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {showArchived ? "Archived" : "History"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              {showArchived ? "Active" : "Archived"}
            </button>
            {offers.length > 1 ? (
              <button
                type="button"
                onClick={() => setShowAllOffers((value) => !value)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {showAllOffers ? "This offer" : "All offers"}
              </button>
            ) : null}
          </div>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
          {visibleThreads.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No sessions yet.</p>
          ) : null}

          {GROUP_ORDER.map((agentId) => {
            const group = visibleThreads.filter((thread) =>
              agentId === "other"
                ? !isAgentId(thread.agent)
                : thread.agent === agentId,
            );
            if (group.length === 0) return null;
            const label = agentId === "other" ? "Other" : AGENTS[agentId].name;
            const hasActive = group.some((thread) => thread.id === params.threadId);
            return (
              <details key={agentId} open={hasActive || group.length <= 5} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60">
                  <span className="flex items-center gap-2">
                    {agentId !== "other" ? (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: `var(--${AGENTS[agentId].colorVar})` }}
                      />
                    ) : null}
                    {label}
                    <span className="text-muted-foreground">({group.length})</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-1 space-y-1 pl-3">
                  {group.map((thread) => {
                    const active = params.threadId === thread.id;
                    const renaming = renamingId === thread.id;
                    return (
                      <div
                        key={thread.id}
                        className={`group/row flex items-start gap-1 rounded-lg px-2 py-1 transition-colors ${
                          active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
                        }`}
                      >
                        {renaming ? (
                          <input
                            autoFocus
                            defaultValue={thread.title}
                            onBlur={(event) => void commitRename(thread.id, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                              if (event.key === "Escape") setRenamingId(null);
                            }}
                            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm text-sidebar-foreground"
                          />
                        ) : (
                          <>
                            <Link
                              to="/studio/$threadId"
                              params={{ threadId: thread.id }}
                              className={`min-w-0 flex-1 px-1 py-1 text-sm transition-colors ${
                                active
                                  ? "text-sidebar-accent-foreground"
                                  : "text-muted-foreground hover:text-sidebar-foreground"
                              }`}
                            >
                              <span className="line-clamp-2 flex items-start gap-1">
                                {thread.is_pinned ? (
                                  <Pin className="mt-1 h-3 w-3 shrink-0 text-primary" />
                                ) : null}
                                {thread.title}
                              </span>
                            </Link>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                              <button
                                type="button"
                                aria-label="Rename session"
                                title="Rename"
                                onClick={() => setRenamingId(thread.id)}
                                className="rounded p-1 text-muted-foreground hover:text-sidebar-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={thread.is_pinned ? "Unpin session" : "Pin session"}
                                title={thread.is_pinned ? "Unpin" : "Pin"}
                                onClick={() =>
                                  void mutate(setThreadPinned(thread.id, !thread.is_pinned))
                                }
                                className="rounded p-1 text-muted-foreground hover:text-sidebar-foreground"
                              >
                                {thread.is_pinned ? (
                                  <PinOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={
                                  thread.is_archived ? "Restore session" : "Archive session"
                                }
                                title={thread.is_archived ? "Restore" : "Archive"}
                                onClick={() =>
                                  void mutate(
                                    setThreadArchived(thread.id, !thread.is_archived),
                                  )
                                }
                                className="rounded p-1 text-muted-foreground hover:text-sidebar-foreground"
                              >
                                {thread.is_archived ? (
                                  <ArchiveRestore className="h-3.5 w-3.5" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/" });
          }}
          className="border-t border-sidebar-border px-5 py-4 text-left text-sm text-muted-foreground hover:text-sidebar-foreground"
        >
          Sign out
        </button>
      </aside>

      <AgentNudges enabled={Boolean(user)} briefId={currentId} />

      <div className="flex min-w-0 flex-1 flex-col">

        <Outlet />
      </div>
    </div>
  );
}
