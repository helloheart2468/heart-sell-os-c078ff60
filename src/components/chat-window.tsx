import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { AGENTS, type AgentId } from "@/lib/heart-sell";

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export function ChatWindow({
  threadId,
  agent,
  initialMessages,
  autoSend,
  onFirstMessage,
}: {
  threadId: string;
  agent: AgentId;
  initialMessages: UIMessage[];
  autoSend?: string;
  onFirstMessage?: (text: string) => void;
}) {
  const config = AGENTS[agent];
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSentRef = useRef(false);

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages: msgs, body }) => {
        const { data } = await supabase.auth.getSession();
        return {
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${data.session?.access_token ?? ""}`,
          },
          body: { ...body, messages: msgs, threadId, agent },
        };
      },
    }),
    onError: (err) => toast.error(err.message || "Something went wrong."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!autoSend || autoSentRef.current) return;
    autoSentRef.current = true;
    void sendMessage({ text: autoSend });
    onFirstMessage?.(autoSend);
  }, [autoSend, sendMessage, onFirstMessage]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy, threadId]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    if (messages.length === 0) onFirstMessage?.(value);
    void sendMessage({ text: value });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-8">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-10 text-center">
              <p className="font-display text-2xl leading-snug text-foreground">
                {config.chatOpener}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {config.starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => submit(starter)}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                variant={message.role === "user" ? "contained" : "flat"}
                className={
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent p-0 text-foreground"
                }
              >
                <MessageResponse>{textOf(message)}</MessageResponse>
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" ? (
            <Shimmer className="text-sm">{config.name} is thinking…</Shimmer>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(message, event) => {
              event.preventDefault();
              submit(message.text ?? "");
              event.currentTarget.reset();
            }}
          >
            <PromptInputTextarea
              ref={inputRef}
              autoFocus
              placeholder={`Talk to ${config.name}…`}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={busy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
