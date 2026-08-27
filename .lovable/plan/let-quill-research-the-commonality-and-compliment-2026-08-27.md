# Let Quill research the commonality and compliment

Yes — Perplexity can do this. Today Quill correctly refuses to invent a commonality or compliment and hands the research back to you. The fix is to give Quill its own research tool so it can go and find genuine, sourced hooks about one specific person, while still letting you type in your own if you already know something better.

## How it will feel

When Quill needs a commonality or compliment, instead of only asking you, it offers a choice:

- "Tell me what you already know" — same as today, you type it in.
- "Let me look them up" — Quill researches that person on the live web and comes back with a short list of real, sourced hooks: recent posts, awards, launches, press, associations, shared groups, geography, alumni or community ties.

You pick the hooks you want (or reject them all), and Quill writes the CCRA message using only those. Anything sourced gets a small link so you can check it in one click before sending. Nothing unverified loses its `[confirm]` marker.

If the research comes back thin, Quill says so plainly and keeps that contact on the Cold list rather than manufacturing a connection — that rule does not change.

## Where it shows up

- Quill chat: the research hooks render as a compact card in the conversation with source links and a "use these" action, similar to how Scout's prospect results already appear.
- Saved lists: hooks Quill finds for a saved person get written back into that prospect's notes, so next time you or Ace open them the research is already there.
- Ace: the same tool is available for call prep rapport openers, since it is the same research question.

## Technical notes

- Add `researchProspect()` to `src/lib/perplexity.server.ts`: a `sonar-pro` call scoped to one named person plus their company/location/links, with a strict system prompt that returns only verifiable items and omits anything it cannot source. Returns `{ commonalities: [], compliments: [], recent_signals: [], citations: [], notes }` where each item carries `text` and `source`.
- Add a `research_person` tool in `src/routes/api/chat.ts`, available to Quill and Ace (Scout keeps `find_prospects` for list building). Input: name, plus optional company, location, link, and the founder's own background so it can spot genuine overlap. It reuses `lookup_saved_contacts` data when the person is already saved.
- Reuse the existing Perplexity error handling, including the `insufficient_quota` case.
- New `src/components/research-hooks.tsx` renders the returned hooks with source links, checkbox selection, a "Use these in my message" action that sends the selection back into the conversation, and a "Save to their notes" action for saved prospects.
- `src/components/chat-window.tsx` renders the `tool-research_person` part, with a shimmer while it runs.
- `src/lib/prompts.server.ts`: update Quill so that when a commonality or compliment is missing it offers both paths rather than only asking; require it to attribute each hook to its source and keep `[confirm]` on anything unsourced. Add the same tool note to Ace's rapport section.
- Prospect notes updates go through the existing `src/lib/prospects.ts` client CRUD; no schema change is needed.
