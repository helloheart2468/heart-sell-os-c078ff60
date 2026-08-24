import { createFileRoute, Link } from "@tanstack/react-router";

import mark from "@/assets/heart-sell-mark.png";
import { AGENT_LIST } from "@/lib/heart-sell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heart Sell OS — Relationship-first sales, operationalised" },
      {
        name: "description",
        content:
          "Turn Dora Rankin's Heart Sell method into daily practice: audience audit, nine lists, pitch-free outreach and 7-step call prep.",
      },
      { property: "og:title", content: "Heart Sell OS" },
      {
        property: "og:description",
        content:
          "Audience audit, nine lists, pitch-free outreach and 7-step call prep — one calm workspace.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <header className="flex items-center gap-3">
          <img src={mark} alt="" className="h-9 w-9" />
          <span className="font-display text-lg tracking-tight text-foreground">Heart Sell OS</span>
        </header>

        <section className="mt-20 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Built on The Heart Sell by Dora Rankin
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
            Sell like a human. Do it every single week.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Four guides that run the method exactly as written — audience audit, the nine lists,
            pitch-free outreach and the 7-step conversation. Use the structured path when you want a
            form, or just talk it through.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to={user ? "/studio" : "/auth"}
              className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {loading ? "Loading…" : user ? "Open the studio" : "Start your audit"}
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-5 sm:grid-cols-2">
          {AGENT_LIST.map((agent) => (
            <article key={agent.id} className="paper-panel p-7">
              <h2 className="font-display text-2xl text-foreground">{agent.name}</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{agent.role}</p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">{agent.tagline}</p>
              <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">
                {agent.chapters}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
