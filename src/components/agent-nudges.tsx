import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { draftFollowUp, prepCall } from "@/lib/followup-handoff";
import { bucketFor, formatDue, nextStepLabel } from "@/lib/followups";
import { listProspects, type Prospect } from "@/lib/prospects";

const STORAGE_KEY = "heartsell:nudges-seen";
const MAX_TOASTS = 2;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function seenToday(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      day?: string;
      ids?: string[];
    };
    if (raw.day !== todayKey()) return new Set();
    return new Set(raw.ids ?? []);
  } catch {
    return new Set();
  }
}

function markSeen(ids: string[]) {
  if (typeof window === "undefined") return;
  const merged = new Set([...seenToday(), ...ids]);
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ day: todayKey(), ids: [...merged] }),
  );
}

/** In-character toasts when a follow-up is due or a call is coming up. */
export function AgentNudges({ enabled, briefId }: { enabled: boolean; briefId?: string | null }) {
  const navigate = useNavigate();
  const prospects = useQuery({
    queryKey: ["prospects", "all", "nudges"],
    queryFn: () => listProspects(undefined, null),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    const rows = prospects.data;
    if (!rows || rows.length === 0) return;
    const seen = seenToday();

    const open = async (prospect: Prospect, agent: "quill" | "ace") => {
      try {
        const threadId =
          agent === "quill"
            ? await draftFollowUp(prospect, briefId)
            : await prepCall(prospect, briefId);
        await navigate({ to: "/studio/$threadId", params: { threadId } });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't open that session.");
      }
    };

    const due = rows
      .filter((prospect) => {
        const bucket = bucketFor(prospect);
        if (bucket !== "overdue" && bucket !== "today" && bucket !== "booked") return false;
        if (bucket === "booked") {
          if (!prospect.next_action_at) return false;
          return new Date(prospect.next_action_at).getTime() <= Date.now() + 86_400_000;
        }
        return true;
      })
      .filter((prospect) => !seen.has(prospect.id))
      .slice(0, MAX_TOASTS);

    if (due.length === 0) return;

    due.forEach((prospect) => {
      const booked = prospect.follow_up_state === "booked";
      toast(
        booked
          ? `Ace here — your call with ${prospect.name} is ${formatDue(prospect.call_at)}.`
          : `Quill here — ${prospect.name} is due for ${nextStepLabel(prospect).toLowerCase()}.`,
        {
          duration: 12_000,
          action: {
            label: booked ? "Prep the call" : "Draft it",
            onClick: () => void open(prospect, booked ? "ace" : "quill"),
          },
          cancel: {
            label: "Later",
            onClick: () => undefined,
          },
        },
      );
    });

    markSeen(due.map((prospect) => prospect.id));
  }, [prospects.data, navigate, briefId]);

  return null;
}
