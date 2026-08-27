import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { isAgentId, type AgentId } from "@/lib/heart-sell";
import { searchProspects } from "@/lib/perplexity.server";
import { buildSystemPrompt } from "@/lib/prompts.server";

type ChatBody = {
  messages?: UIMessage[];
  threadId?: string;
  agent?: string;
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildTools(agent: AgentId, supabase: SupabaseClient, briefId: string | null) {
  const lookupSavedContacts = tool({
    description:
      "Look up people the founder has already saved to their Heart Sell lists, by name, company or keyword. Use this before asking the founder to re-type details about a contact.",
    inputSchema: z.object({
      query: z.string().describe("Name, company or keyword to search saved prospects for."),
    }),
    execute: async ({ query }) => {
      const term = query.replace(/[%,]/g, " ").trim();
      const { data, error } = await supabase
        .from("prospects")
        .select(
          "id, name, title, company, blurb, location, linkedin_url, social_url, website, email, audience, temperature, status, why_fits, notes, list_id, brief_id",
        )
        .or(`name.ilike.%${term}%,company.ilike.%${term}%,blurb.ilike.%${term}%`)
        .limit(8);
      if (error) return { error: error.message, matches: [] };
      const matches = (data ?? []).map((row) => {
        const rowBrief = (row as { brief_id?: string | null }).brief_id ?? null;
        return { ...row, from_another_offer: Boolean(briefId && rowBrief && rowBrief !== briefId) };
      });
      return { matches };
    },
  });

  const listMyLists = tool({
    description: "List the founder's saved prospect lists with how many people are on each.",
    inputSchema: z.object({}),
    execute: async () => {
      let listQuery = supabase
        .from("prospect_lists")
        .select("id, name, audience, temperature");
      if (briefId) listQuery = listQuery.eq("brief_id", briefId);
      const { data: lists, error } = await listQuery
        .order("updated_at", { ascending: false })
        .limit(25);
      if (error) return { error: error.message, lists: [] };
      const { data: rows } = await supabase.from("prospects").select("list_id");
      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        const key = (row as { list_id: string | null }).list_id;
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return {
        lists: (lists ?? []).map((list) => ({
          ...list,
          count: counts.get((list as { id: string }).id) ?? 0,
        })),
      };
    },
  });

  const suggestActions = tool({
    description:
      "Propose concrete next actions the founder can add to their to-do list, one item each. Call this whenever you recommend actions — including a weekly Big 5 commitment — so each one gets an 'add to my to-dos' button. Keep titles short, specific and doable.",
    inputSchema: z.object({
      actions: z
        .array(
          z.object({
            title: z.string().describe("Short action, e.g. 'Send CCRA message to Maya Ellis'."),
            about: z
              .string()
              .optional()
              .describe("Optional short context, e.g. the person or list it relates to."),
          }),
        )
        .describe("Between 1 and 7 actions."),
    }),
    execute: async ({ actions }) => ({ actions: actions.slice(0, 7) }),
  });

  const researchPerson = tool({
    description:
      "Research ONE named person on the live web to find a genuine commonality, a specific compliment, and recent signals — each with a source link. Use this when the founder does not already have a real hook and says they'd like you to look, or offers no hook when asked. Never invent hooks; only use what this returns or what the founder tells you.",
    inputSchema: z.object({
      name: z.string().describe("Full name of the person."),
      company: z.string().optional(),
      title: z.string().optional(),
      location: z.string().optional(),
      link: z.string().optional().describe("LinkedIn, social or website URL if known."),
      prospect_id: z
        .string()
        .optional()
        .describe("The saved prospect id from lookup_saved_contacts, if they are already saved."),
    }),
    execute: async ({ name, company, title, location, link, prospect_id }) => {
      try {
        const result = await researchProspect({
          name,
          ...(company ? { company } : {}),
          ...(title ? { title } : {}),
          ...(location ? { location } : {}),
          ...(link ? { link } : {}),
          ...(founderContext ? { founderContext } : {}),
        });
        return { ...result, prospect_id: prospect_id ?? null };
      } catch (error) {
        return {
          person: name,
          error: error instanceof Error ? error.message : "Research failed.",
          commonalities: [],
          compliments: [],
          recent_signals: [],
          citations: [],
        };
      }
    },
  });

  const base = {
    lookup_saved_contacts: lookupSavedContacts,
    list_my_lists: listMyLists,
    suggest_actions: suggestActions,
  };

  if (agent === "quill" || agent === "ace" || agent === "guide") {
    return { ...base, research_person: researchPerson };
  }

  if (agent !== "scout") return base;

  return {
    ...base,
    find_prospects: tool({
      description:
        "Search the live web for real people or organizations matching an agreed prospect brief. Only call this AFTER the founder has confirmed the target profile. Returns real named prospects with links the founder can save to a list.",
      inputSchema: z.object({
        brief: z
          .string()
          .describe(
            "A rich description of exactly who to find: role/title, type of business, size, signals, and any qualifying filters.",
          ),
        audience: z
          .string()
          .describe("Ideal Clients, Potential Partners or Ecosystem Contacts."),
        region: z.string().describe("Geography or market focus. Use 'any' if unrestricted."),
        count: z.number().describe("How many prospects to return, typically 10."),
      }),
      execute: async ({ brief, audience, region, count }) => {
        try {
          const result = await searchProspects({
            brief,
            audience,
            count,
            ...(region && region.toLowerCase() !== "any" ? { region } : {}),
          });
          return {
            audience,
            ...(region ? { region } : {}),
            found: result.prospects.length,
            prospects: result.prospects,
            citations: result.citations.slice(0, 10),
            ...(result.notes ? { notes: result.notes } : {}),
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Prospect search failed.",
            prospects: [],
          };
        }
      },
    }),
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
        if (!token) return json({ error: "Not signed in." }, 401);

        const body = (await request.json()) as ChatBody;
        const messages = body.messages;
        const threadId = body.threadId;
        const agent: AgentId = body.agent && isAgentId(body.agent) ? body.agent : "sage";

        if (!Array.isArray(messages) || !threadId) {
          return json({ error: "Missing messages or conversation id." }, 400);
        }

        const supabase = createClient(
          import.meta.env["VITE_SUPABASE_URL"] as string,
          import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return json({ error: "Session expired. Please sign in again." }, 401);

        const { data: thread } = await supabase
          .from("threads")
          .select("id, user_id, brief_id")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return json({ error: "Conversation not found." }, 404);

        const threadBriefId = (thread as { brief_id?: string | null }).brief_id ?? null;
        let briefId = threadBriefId;
        if (!briefId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("current_brief_id")
            .maybeSingle();
          briefId = (profile as { current_brief_id?: string | null } | null)?.current_brief_id ?? null;
        }

        const { data: offers } = await supabase
          .from("audience_briefs")
          .select("id, name")
          .eq("is_archived", false);

        if (!briefId) briefId = (offers?.[0] as { id?: string } | undefined)?.id ?? null;

        const { data: brief } = briefId
          ? await supabase.from("audience_briefs").select("*").eq("id", briefId).maybeSingle()
          : { data: null };

        if (!threadBriefId && briefId) {
          await supabase.from("threads").update({ brief_id: briefId }).eq("id", threadId);
        }

        const { data: business } = await supabase
          .from("business_profile")
          .select("business_summary, problems_solved, unfair_advantage, story_notes")
          .maybeSingle();

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "AI is not configured for this app." }, 500);

        // Persist the newest user message before streaming.
        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          const { error: insertError } = await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            client_message_id: last.id,
            parts: last.parts,
          });
          if (insertError) console.error("save user message failed", insertError);
        }

        const gateway = createLovableAiGatewayProvider(apiKey);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: buildSystemPrompt(
              agent,
              (brief as Record<string, string> | null) ?? null,
              (business as Record<string, string> | null) ?? null,
              ((offers ?? []) as { name?: string }[]).map((offer) => offer.name ?? ""),
            ),
            messages: await convertToModelMessages(messages),
            tools: buildTools(agent, supabase, briefId),
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ responseMessage }) => {
              const { error } = await supabase.from("messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                client_message_id: responseMessage.id,
                parts: responseMessage.parts,
              });
              if (error) console.error("save assistant message failed", error);
              await supabase
                .from("threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId);
            },
          });
        } catch (error) {
          const status =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 500;
          const message =
            status === 429
              ? "Too many requests right now — give it a moment and try again."
              : status === 402
                ? "This workspace is out of AI credits. Add credits in Lovable to keep going."
                : "The AI service returned an error. Please try again.";
          console.error("chat stream failed", error);
          return json({ error: message }, status || 500);
        }
      },
    },
  },
});
