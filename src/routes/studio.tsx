import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import mark from "@/assets/heart-sell-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AGENTS, isAgentId } from "@/lib/heart-sell";
import { useOffers } from "@/lib/offers";
import { listThreads } from "@/lib/threads";

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

  const threads = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: listThreads,
    enabled: Boolean(user),
  });

  const visibleThreads = (threads.data ?? []).filter(
    (thread) => showAllOffers || !currentId || !thread.brief_id || thread.brief_id === currentId,
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
                    return (
                      <Link
                        key={thread.id}
                        to="/studio/$threadId"
                        params={{ threadId: thread.id }}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        }`}
                      >
                        <span className="line-clamp-2">{thread.title}</span>
                      </Link>
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

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
