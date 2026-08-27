# Campaigns, Conversations and Dripify exports

Two new sidebar homes, one export engine. Nothing existing moves: Lists (Scout), Audience Audit (Sage), Follow-ups and To-dos stay exactly where they are.

## Sidebar shape

```text
Guided path
Audience Audit   (Sage)
Business core
My lists         (Scout)
Campaigns        (Quill)   <- new
Conversations    (Ace)     <- new
Follow-ups
My to-dos
```

## Campaigns (Quill)

A campaign wraps one list with one message sequence. Create a campaign, pick a list, and Quill drafts per person.

- Create: name, pick a list, channel (LinkedIn / email), inherits the current offer.
- Three message slots matching the 7-Day Sales Path:
  1. Connection request note (LinkedIn limit, short)
  2. Message after they connect (CCRA first touch)
  3. Follow-up message
- For each slot you can write it yourself or hit "Draft with Quill" — opens a Quill session pre-loaded with the offer brief, the list's audience, and the campaign's other messages so the sequence stays coherent.
- Per person, Quill personalises each slot using the saved blurb, "why they fit" and any approved research hook. Personalised drafts save against the prospect so nothing is lost when you leave the chat.
- Campaign screen shows the roster: name, LinkedIn URL present or missing, which messages are drafted, and follow-up state. Missing LinkedIn URLs are flagged before export.
- Logging "Sent" from a campaign row uses the same follow-up strip you already have, so the cadence and nudges keep working.

## Exports

One export button on a campaign, three formats:

1. **Dripify CSV** — one row per person: `linkedin_url, first_name, last_name, full_name, company, title, connection_note, message_1, message_2`. Only people with a LinkedIn URL are included; the rest are listed as skipped so you can fix them. Column set is tickable at export time.
2. **VA CSV** — one row per person: name, LinkedIn, email, channel, message to send, due date, status. Opens straight in Sheets.
3. **Printable checklist** — a formatted document grouped by person: their context in two lines, the exact message ready to copy, and a tick box. Made for blowing through outreach in a spurt or handing to an assistant.

There's also an "Export everything due" option on Follow-ups that produces the same VA CSV + checklist across all campaigns, so a session isn't limited to one campaign.

## Conversations (Ace)

Everyone who has replied or has a call booked, in one place — the human half of the follow-up data you already log.

- Grouped: Calls booked, Replied and interested, In conversation, Not now.
- Each row shows the touch history you already record, the last reply outcome, and a one-tap "Prep the call" into Ace.
- Ace opens with the person's list context, campaign messages already sent, and any approved research hooks, so prep starts from what actually happened.

## Technical notes

- New tables: `campaigns` (name, list_id, brief_id, channel, three message templates, status) and `campaign_messages` (campaign_id, prospect_id, slot, body, approved flag). Owner-scoped RLS and grants, same pattern as `prospects` and `touches`.
- Export runs client-side from already-loaded rows: CSV via a Blob download; the checklist as a print-styled HTML view using the Prata/Montserrat brand so `Cmd+P → Save as PDF` produces a clean sheet. No new server dependency.
- Quill drafting reuses the existing chat tools; a new `save_campaign_message` tool lets Quill write a personalised draft back to `campaign_messages` when you approve it, matching how research hooks are approved today.
- Conversations is a read view over `prospects` + `touches` — no new schema.
- Routes: `/studio/campaigns`, `/studio/campaigns/$campaignId`, `/studio/conversations`.
