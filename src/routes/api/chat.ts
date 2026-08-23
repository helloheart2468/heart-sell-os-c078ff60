import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { isAgentId } from "@/lib/heart-sell";
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

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
        if (!token) return json({ error: "Not signed in." }, 401);

        const body = (await request.json()) as ChatBody;
        const messages = body.messages;
        const threadId = body.threadId;
        const agent = body.agent && isAgentId(body.agent) ? body.agent : "sage";

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
          .select("id, user_id")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return json({ error: "Conversation not found." }, 404);

        const { data: brief } = await supabase
          .from("audience_briefs")
          .select("*")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
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
            system: buildSystemPrompt(agent, brief ?? null),
            messages: await convertToModelMessages(messages),
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
