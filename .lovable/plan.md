# Follow-up flow: one tap to log, agents do the chasing

The goal is that logging an outreach touch takes one tap, and the app — not the user — remembers what's due and who should handle it. It should feel like Quill and Ace tapping you on the shoulder, not like a CRM.

## The core idea: one status strip per prospect

Every prospect card gets a small strip with the only actions that matter:

```text
[ Sent ]   [ Replied ▾ ]   [ Call booked ]   [ Not now ]
Next touch: Message 2 · due Aug 30   [ Draft it ]  [ Snooze ]
```

- **Sent** — logs the touch and automatically sets the next follow-up date from the 7-Day Sales Path (Message 1 → +3 days, Message 2 → +3 days, Message 3 → closeout, then done). One tap; the date can be nudged but is never required.
- **Replied** — a tiny menu: Interested / Not now / Not interested / Just chatting. Interested pushes toward booking; Not now sets a longer, gentle re-touch; Not interested closes the loop with no more nudges.
- **Call booked** — asks only for the date, then hands off to Ace.
- **Not now / Close** — stops the nudges cleanly.

No pipeline stages, no required fields, no data entry beyond a tap.

## Agent nudges (toasts)

When something is due, a small in-character toast appears (on entering the studio, and while working):

- "Quill here — Sarah Chen is due for Message 2 today." → **Draft the follow-up** (opens Quill with the prospect, previous message, and their commonality/compliment already loaded) or **Log a reply instead**.
- "Ace here — your call with Marcus is tomorrow." → **Prep the call** (opens Ace with the prospect's blurb, hooks and notes).

Toasts are capped (a couple at a time, dismissible, never repeat the same nudge the same day) so they stay welcome.

## A Follow-ups view

A sidebar link with a count badge, plus a page grouped as **Overdue / Today / This week / Waiting on reply / Calls booked**. Each row shows the person, what was last sent and when, and the same one-tap actions. This is the single place a solo user can open each morning and clear.

## Working alongside a real CRM

Nothing here duplicates a CRM: no deals, no revenue, no custom fields. Each prospect keeps a simple, readable touch history (what was sent, when, what came back) and the list stays exportable to CSV so it can be pushed into whatever CRM the user already runs.

## Delegation

Solo-only for this build, as agreed. The design deliberately keeps the touch history and status on the prospect record rather than on a person, so shared-team access can be layered on later without reworking the data.

## Technical notes

- New `touches` table (user-scoped RLS + grants): `prospect_id`, `kind` (sent / reply / call_booked / note), `channel`, `sequence_step`, `outcome`, `body_excerpt`, `occurred_at`, `thread_id`.
- Prospect gains `next_action_at`, `next_action_kind`, `last_touch_at`, `sequence_step`, and a follow-up `state` (active / waiting / booked / closed). Cadence derives from the 7-Day Sales Path constants shared with Quill's prompt.
- `src/lib/followups.ts`: log touch, advance cadence, snooze, close; `dueFollowups()` query grouped by bucket, offer-scoped like the rest of the app.
- Nudge engine: a client hook in the studio layout reads due items, renders sonner toasts with agent voice + action links, and records dismissals in local storage to avoid repeats within a day.
- Quill and Ace handoffs extended to accept a prospect + touch history so drafts reference what was already sent; Quill's follow-up drafts default to the correct sequence step.
- New route `/studio/followups`, sidebar entry with due count; prospect cards on `/studio/lists` gain the status strip inside the existing collapsible card.
