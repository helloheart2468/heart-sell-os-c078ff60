import { createThread } from "@/lib/threads";
import type { AgentId } from "@/lib/heart-sell";

export const PENDING_PREFIX = "pending:";

export async function startSession(
  agent: AgentId,
  mode: "chat" | "structured",
  prompt?: string,
  title?: string,
): Promise<string> {
  const threadId = await createThread(agent, mode, title);
  if (prompt && typeof window !== "undefined") {
    sessionStorage.setItem(`${PENDING_PREFIX}${threadId}`, prompt);
  }
  return threadId;
}
