import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildSystemPrompt } from "@/lib/prompts.server";

export type GeneratedSection = { heading: string; body: string };

const goalSchema = z.object({
  who_sells: z.string().min(1),
  focus: z.string().min(1),
  outcome: z.string().default(""),
  capacity: z.string().default(""),
  team_notes: z.string().optional(),
  event_name: z.string().optional(),
  event_date: z.string().optional(),
});

type Goal = z.infer<typeof goalSchema>;

/** Section plan varies with who is doing the selling and what for. */
export function planSections(goal: Goal): string[] {
  const teamMode = /team|va|assistant/i.test(goal.who_sells);
  const eventMode = /event|workshop/i.test(goal.focus);
  const partnerMode = /partner|ecosystem/i.test(goal.focus);

  const sections = [
    "Purpose and how to use this manual",
    "What we sell and the broken phone we fix",
    "Who we sell to: the audiences and the buyer filters",
    teamMode ? "The nine lists and who builds them" : "The nine lists: how to build and keep them",
  ];

  if (partnerMode) sections.push("Partner and ecosystem plays: who to approach and the exchange offered");
  if (eventMode) {
    sections.push(
      "The event invitation sequence",
      "Working the room and the conversations on the day",
      "The post-event follow-up path",
    );
  } else {
    sections.push(
      "First-touch messaging: CCRA, written in our voice",
      "The 7-Day Sales Path: message 2 and message 3",
    );
  }

  sections.push(
    "The 7-Step Heart Sell conversation, script by script",
    "Three-level profiling questions for this audience",
    "Telling the story: credentials plus vulnerability",
    "The pitch and what happens after it",
    "Objection handling: what they really mean",
    "The weekly Big 5 and the rhythm that holds it",
  );

  if (teamMode) {
    sections.push(
      "Who does what: roles, handoffs and escalation",
      "Quality bar: what good looks like and what we never do",
      "Onboarding a new person in their first two weeks",
      "Reporting and the weekly review",
    );
  }

  sections.push("The first 30 days: a concrete starting plan");
  return sections;
}

export const generatePlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        goal: goalSchema,
        briefId: z.string().uuid().nullable().optional(),
        only: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ sections: GeneratedSection[] }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The writing service is not configured for this app.");
    const supabase = context.supabase;

    const { data: business } = await supabase
      .from("business_profile")
      .select("business_summary, problems_solved, unfair_advantage, story_notes")
      .maybeSingle();

    let briefId = data.briefId ?? null;
    if (!briefId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_brief_id")
        .maybeSingle();
      briefId = profile?.current_brief_id ?? null;
    }

    const { data: brief } = briefId
      ? await supabase.from("audience_briefs").select("*").eq("id", briefId).maybeSingle()
      : { data: null };

    const system = `${buildSystemPrompt("guide", (brief ?? null) as never, business ?? null)}

YOU ARE NOW WRITING A HEART SELL OPERATING MANUAL for this founder — a document they will print, hand to a VA or a sales team, and actually work from.
Rules for this document:
- Write the finished manual, not advice about writing one. No preamble, no "in this section we will".
- Everything must be grounded in THEIR audit and business above. Where a detail is genuinely missing, write [confirm: what's needed] inline rather than inventing it.
- Scripts and messages must be speakable lines they can read aloud or paste, not paragraphs of theory. Use short lines, quoted where they are said out loud.
- Use markdown: short paragraphs, "-" bullets, and tables only where a table earns its place. Never use headings inside a section — the section heading is supplied.
- No hype, no filler, no emoji. Dora's voice: warm, direct, plainspoken.
- Length per section: 200-450 words unless it is a script section, which can be longer.`;

    const context_lines = [
      `Who is doing the selling: ${data.goal.who_sells}`,
      `What this manual is for: ${data.goal.focus}`,
      data.goal.outcome ? `The outcome they want: ${data.goal.outcome}` : "",
      data.goal.capacity ? `Selling time available: ${data.goal.capacity}` : "",
      data.goal.team_notes ? `About their team: ${data.goal.team_notes}` : "",
      data.goal.event_name ? `Event: ${data.goal.event_name}` : "",
      data.goal.event_date ? `Event date: ${data.goal.event_date}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3.7-flash");

    const headings = data.only ? [data.only] : planSections(data.goal);

    const write = async (heading: string): Promise<GeneratedSection> => {
      const result = await generateText({
        model,
        system,
        prompt: `${context_lines}

Write the section titled: "${heading}"

Output only the body of that section in markdown. Do not repeat the title.`,
      });
      return { heading, body: result.text.trim() };
    };

    // Small concurrency keeps the whole manual under a reasonable wait.
    const sections: GeneratedSection[] = new Array(headings.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < headings.length) {
        const index = cursor++;
        const heading = headings[index];
        if (!heading) return;
        try {
          sections[index] = await write(heading);
        } catch (error) {
          sections[index] = {
            heading,
            body: `_This section could not be written just now (${
              error instanceof Error ? error.message : "unknown error"
            }). Regenerate it from the playbook screen._`,
          };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, headings.length) }, worker));

    return { sections: sections.filter(Boolean) };
  });
