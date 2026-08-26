import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import mark from "@/assets/heart-sell-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AGENTS, isAgentId } from "@/lib/heart-sell";
import { listThreads } from "@/lib/threads";

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

  const threads = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: listThreads,
    enabled: Boolean(user),
  });

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

        <div className="px-5">
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
            to="/studio/lists"
            className="mt-2 flex h-9 w-full items-center justify-center rounded-full border border-border text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            My lists
          </Link>
        </div>

        <p className="px-5 pb-2 pt-7 text-xs uppercase tracking-wider text-muted-foreground">
          History
        </p>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {(threads.data ?? []).map((thread) => {
            const agent = isAgentId(thread.agent) ? AGENTS[thread.agent] : null;
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
                {agent ? (
                  <span className="mt-1 block text-xs uppercase tracking-wider text-muted-foreground">
                    {agent.name}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {threads.data?.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No sessions yet.</p>
          ) : null}
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
