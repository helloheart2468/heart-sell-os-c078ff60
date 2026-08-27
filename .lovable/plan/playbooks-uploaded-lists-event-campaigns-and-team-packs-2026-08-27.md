# Playbooks, uploaded lists, event campaigns and team packs

Four new capabilities, all built on what already exists (offers, lists, campaigns, follow-ups) — no new agents, no parallel systems.

## 1. Heart Sell Playbook (goal-first, downloadable)

New sidebar item **Playbook**.

- Step 1 — goal picker: a short form, not a chat. Who is selling (just me / me plus a VA or assistant / a sales team), what they're selling this for (this offer, an event or workshop, partnerships, ecosystem growth), the outcome they want, and their weekly capacity.
- Step 2 — the app assembles the manual from Dora's canon plus their Business Core and the selected offer's Audience Audit, so it is *their* manual, not a template. Sections vary by goal:
  - Solo founder: purpose, their positioning and broken phone, the Nine Lists as they actually filled them, CCRA templates in their voice, the 7-Day Sales Path, the 7-Step Conversation with their three-level profiling questions, objection handling, weekly Big 5.
  - Team or VA: everything above plus role split (who researches, who sends, who takes the call), verbatim call scripts, message scripts per step, quality bar and "never do this" rules, handoff and reporting rhythm, onboarding checklist for a new rep.
  - Event/workshop: invite sequence, room-working script, post-event follow-up path.
- Step 3 — review on screen section by section (regenerate any single section), then **Download PDF** and **Download Word (.docx)**, both branded in Prata/Montserrat with the pink/ink palette.
- Saved to the existing artifacts table so it can be reopened, re-downloaded, and regenerated when the audit changes.
- Refinement over the attached examples: no filler chapters, every section grounded in their real audit answers, scripts written as speakable lines rather than paragraphs of theory, and anything the app cannot know marked `[confirm]` instead of invented.

## 2. Upload your own list

On **My lists**, an **Upload a list** button.

- Drop a CSV or paste rows; the app previews the first rows and maps columns (name, title, company, LinkedIn URL, email, website, location, notes) with sensible auto-detection, editable before import.
- Choose the destination: a new list or an existing one, plus audience and temperature.
- Duplicates matched on LinkedIn URL or name plus company are flagged and skipped by default.
- After import, gaps are visible per row. Select rows and run **Find LinkedIn + details** in batches (same capped, sourced, confidence-scored research already used for commonality research). Nothing runs automatically; sources are shown and everything unverified stays `[verify]`.
- From there the existing path already works: build a campaign on that list, draft with Quill, export to Dripify.

## 3. Event and workshop campaigns

Campaigns get a **purpose**: evergreen outreach, event or workshop, launch, or re-engagement. Event/workshop adds event name, date, format and link.

- Purpose and event details flow into Quill's drafting so the sequence is invitation-shaped (invite, nudge, closeout) instead of a generic CCRA path, still pitch-free in message one.
- Campaign list and exports show the purpose; nothing else about campaigns changes.

## 4. Team pack export

Alongside the Dripify wizard and the send-it-yourself pack, a **Prepare for my team** export.

- Choose the assignee's name, their weekly goal (number of sends or conversations booked), which steps to include, and the format: CSV, Word document, or PDF checklist.
- The pack contains a one-page brief (who this audience is, the tone rules, what never to change, what to escalate), then one block per prospect with their LinkedIn link, the approved messages, and a place to note what was sent.
- Sends and replies logged back in the app still drive follow-ups and Ace's conversation nudges.

## 5. Making the chat aware of all of it

The Guide, Scout and Quill prompts learn these routes so free chat surfaces them naturally: "I have a list already" → upload flow, "I need LinkedIn profiles for these people" → batch enrichment, "I have a workshop next month" → event campaign, "my assistant does my outreach" → team pack, "give me a manual/playbook" → the goal-first playbook. Each is offered as a link the founder can click from the chat, not just described.

The studio home gets a small **Start from something you have** row: Upload a list · Prepare a playbook · Plan an event campaign — alongside the existing open chat and the four guides.

## Technical notes

- Playbook generation: a server function that composes Business Core plus the offer brief plus the goal answers into the manual, section by section, using the existing AI gateway; results saved as an artifact.
- Documents built client-side — `docx` for Word, `jspdf` for PDF with Prata and Montserrat embedded so brand fonts survive the export. No server-side rendering (the worker runtime can't run native document tooling).
- CSV import parsed client-side; imports use existing owner-scoped prospect inserts.
- Migration: add `purpose`, `event_name`, `event_date`, `event_link` to `campaigns`; add `source` and `enrichment_state` to `prospects`; add a `playbooks` table (owner RLS + grants) for goal answers and generated sections.
