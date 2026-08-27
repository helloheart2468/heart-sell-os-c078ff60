# Multiple offers, one business

Right now there is a single Audience Audit per account. This adds offers: your business core stays in one place, and each offer carries its own broken phone and audiences. Everything you make gets stamped with the offer it came from, and you can switch offers globally or per session.

## The shape

```text
Business core (one per account)
  business summary · expertise / unfair advantage · story notes · offers overview

Offer  "Fractional CMO retainer"        Offer  "Workshop day"
  broken phone                            broken phone
  ICP + titles · care/fear/need            ICP + titles · care/fear/need
  pain points · desired outcomes           pain points · desired outcomes
  partners · ecosystems · buyer filters    partners · ecosystems · buyer filters
  offer summary + pricing                  offer summary + pricing
      |                                        |
  threads · lists · saved people           threads · lists · saved people
```

## What changes for you

**Business core (new page).** Sage asks the business-wide questions once: what you do, your expertise, your story. Never retyped.

**Offers.** Each offer is its own Audience Audit covering the broken phone and the three audiences. Create a new one from scratch or duplicate an existing offer as a starting point. Rename, archive, delete.

**Sage.** The Audience Audit page becomes per-offer. Sage's structured form drops the business-core questions into a short read-only recap at the top, then works the offer-specific fields. Conversational Sage can build a whole new offer from a chat.

**A current offer, switchable two ways.**
- A switcher at the top of the sidebar sets the current offer. It sticks until you change it.
- Every place a session starts (studio home, the agent cards, open chat, the guided path) shows which offer the session will use with an inline "change" control, so one-off work against another offer never disturbs your default.
- Inside a session, the header shows the offer with a change control. Switching mid-thread re-stamps the thread and tells the guide, so it can carry on with the new audit.

**Stamped work.** Threads, prospect lists and saved people all record their offer.
- Scout only researches against the session's offer audit, and new lists inherit it.
- My Lists gets an offer filter, with an "all offers" view.
- Quill and Ace pull the session offer's audit; when a saved person belongs to a different offer, they say so instead of silently mixing contexts.

**Sidebar history.** The existing agent groups now filter to the current offer, with an "all offers" toggle so nothing gets lost.

**Your existing audit.** It is migrated into the business core plus one offer called after your current audit name, and all existing threads, lists and people are stamped to it. Nothing is lost and nothing needs redoing.

## Technical notes

- New `business_profile` table (one row per user): business_summary, problems_solved, unfair_advantage, story_notes. RLS + grants scoped to `auth.uid()`.
- `audience_briefs` keeps the offer-level columns and gains `is_archived`, `sort_order`. `is_active` is retired in favour of an explicit current-offer choice; business-core columns stay on the table for one migration step, then are cleared after backfill.
- `profiles` gains `current_brief_id` (the sticky global default). Client also mirrors it for instant switching.
- `threads`, `prospect_lists`, `prospects` each gain a nullable `brief_id` referencing `audience_briefs(id)` with `on delete set null`, plus indexes on `(user_id, brief_id)`.
- Backfill migration: create `business_profile` rows from each user's active brief, stamp every existing thread/list/prospect with that brief id, set `profiles.current_brief_id`.
- `src/lib/threads.ts`: replace `getActiveBrief`/`saveBrief` with `listBriefs`, `getBrief`, `createBrief` (with optional duplicate-from), `updateBrief`, `archiveBrief`, plus business-core get/save. `createThread` takes `briefId`.
- `src/routes/api/chat.ts`: resolve the brief from `threads.brief_id` (falling back to the profile default) rather than `is_active`; `buildSystemPrompt` in `src/lib/prompts.server.ts` takes business core + offer brief and renders both blocks. Scout's `find_prospects` and the saved-contact tools filter by the thread's brief and flag cross-offer matches.
- New `OfferContext` (React context + query) exposing current offer, offer list and setter; sidebar switcher and per-entry override read from it. Per-session override is passed at thread creation, not stored in the URL.
- New routes: `/studio/business` (core) and `/studio/offers` (list/manage); `/studio/brief` becomes `/studio/brief/$briefId` for editing a single offer.
