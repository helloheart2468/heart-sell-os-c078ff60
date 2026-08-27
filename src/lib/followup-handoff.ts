import { startSession } from "@/lib/handoff";
import { listTouches, stepLabel, type Touch } from "@/lib/followups";
import { prospectSummary, type Prospect } from "@/lib/prospects";

function touchLine(touch: Touch): string {
  const when = new Date(touch.occurred_at).toLocaleDateString();
  if (touch.kind === "sent") return `${when} — sent ${stepLabel(touch.sequence_step)}`;
  if (touch.kind === "reply") return `${when} — they replied (${touch.outcome ?? "reply"})`;
  if (touch.kind === "call_booked") return `${when} — call booked`;
  return `${when} — note (${touch.outcome ?? "note"})`;
}

export async function touchHistory(prospectId: string): Promise<string> {
  try {
    const touches = await listTouches(prospectId);
    if (touches.length === 0) return "No touches logged yet.";
    return touches.slice(0, 8).map(touchLine).reverse().join("\n");
  } catch {
    return "No touches logged yet.";
  }
}

/** Opens Quill with the prospect, their history and the right sequence step. */
export async function draftFollowUp(prospect: Prospect, fallbackBriefId?: string | null) {
  const history = await touchHistory(prospect.id);
  const step = Math.min((prospect.sequence_step ?? 0) + 1, 3);
  const prompt = `It's time to follow up with someone from my list.

${prospectSummary(prospect)}

What's happened so far:
${history}

Write ${stepLabel(step)} of the 7-Day Sales Path for them. Don't repeat the pitch, don't guilt them, and keep it in my voice. Ask me for anything real you need — never invent a commonality.`;
  return startSession("quill", "chat", prompt, undefined, prospect.brief_id ?? fallbackBriefId ?? null);
}

/** Opens Ace with the prospect and their history for call prep. */
export async function prepCall(prospect: Prospect, fallbackBriefId?: string | null) {
  const history = await touchHistory(prospect.id);
  const when = prospect.call_at
    ? new Date(prospect.call_at).toLocaleString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "soon";
  const prompt = `I have a call with ${prospect.name} (${when}). Here's what we have on file:

${prospectSummary(prospect)}

What's happened so far:
${history}

Build my prep sheet using the 7-Step Conversation.`;
  return startSession("ace", "chat", prompt, undefined, prospect.brief_id ?? fallbackBriefId ?? null);
}
