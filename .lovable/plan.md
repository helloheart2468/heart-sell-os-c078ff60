# Simple to-dos, not a weekly planner

Weekly plans die because they demand upkeep. A to-do list doesn't — you add an action the moment a guide suggests it, tick it when it's done, and ignore it otherwise. No weeks, no resets, no streaks, no guilt.

## The flow

1. Any guide (Guide, Sage, Scout, Quill, Ace) suggests concrete actions — including Big 5 commitments — as part of its answer.
2. Those suggestions render in the chat as a small list of one-line actions, each with a plus button: "Add to my to-dos". Item by item, nothing bulk-added behind your back.
3. Added items go to one shared to-do list, scoped to the current offer, stamped with which guide suggested it and (when relevant) which prospect it's about.
4. A "To-dos" link in the sidebar shows an open count. Clicking opens a small page: open items on top, done items collapsed below, a one-line "add your own" field, tick to complete, x to delete.
5. Where an item is about a saved prospect, it carries a link straight into Quill or Ace for that person.

That's the whole feature. No calendar, no scheduling, no weekly targets, no progress bars.

## Why it won't crowd the app

- One new sidebar link and one small page — same weight as Lists.
- In chat, suggestions appear as compact one-line rows under the reply, not big cards.
- Agents only propose to-dos when they've actually recommended actions; ordinary answers look exactly as they do now.

## Technical notes

**Database** — new `todos` table: `id`, `user_id`, `brief_id`, `title`, `agent`, `prospect_id` (nullable), `thread_id` (nullable), `is_done`, `done_at`, `sort_order`, timestamps. RLS scoped to `auth.uid()`, with grants for `authenticated` and `service_role`, following the existing prospects pattern.

**AI tool** — add a `suggest_actions` tool available to all agents in `src/routes/api/chat.ts`: takes a short array of action titles (plus optional prospect name). It only returns the proposal; nothing is written to the database until the user clicks add. Agent prompts in `src/lib/prompts.server.ts` get one line each: when you recommend concrete next actions (including Big 5 commitments), call `suggest_actions` with them.

**UI**
- `src/components/action-suggestions.tsx` — renders `tool-suggest_actions` output as compact rows with a plus button; button flips to a checkmark once added. Mirrors the `prospect-results.tsx` pattern.
- `src/components/chat-window.tsx` — render the new tool part.
- `src/lib/todos.ts` — client CRUD + React Query hooks, offer-scoped like `prospects.ts`.
- `src/routes/studio.todos.tsx` — the small page.
- `src/routes/studio.tsx` — sidebar link with open count.
- `src/components/prospect-results.tsx` and `src/routes/studio.lists.tsx` — optional small "Add to-do" affordance per prospect (e.g. "Send CCRA message to X"), reusing the same store.
