import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Check, Clock, MessageSquare, PenLine, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { draftFollowUp, prepCall } from "@/lib/followup-handoff";
import {
  closeFollowUp,
  formatDue,
  logCallBooked,
  logReply,
  logSent,
  nextStepLabel,
  reopenFollowUp,
  snoozeFollowUp,
  type ReplyOutcome,
} from "@/lib/followups";
import type { Prospect } from "@/lib/prospects";

const REPLY_OPTIONS: { value: ReplyOutcome; label: string }[] = [
  { value: "interested", label: "Interested" },
  { value: "chatting", label: "Just chatting" },
  { value: "not_now", label: "Not now" },
  { value: "not_interested", label: "Not interested" },
];

export function FollowUpStrip({
  prospect,
  briefId,
  campaignId,
  onChange,
}: {
  prospect: Prospect;
  briefId?: string | null;
  /** When the strip is rendered inside a campaign, every touch is stamped with it. */
  campaignId?: string | null;
  onChange: () => void | Promise<unknown>;
}) {
  const navigate = useNavigate();
  const [showReply, setShowReply] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [callAt, setCallAt] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action;
      await onChange();
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log that.");
    } finally {
      setBusy(false);
      setShowReply(false);
      setShowCall(false);
    }
  };

  const openAgent = async (kind: "quill" | "ace") => {
    try {
      const threadId =
        kind === "quill"
          ? await draftFollowUp(prospect, briefId)
          : await prepCall(prospect, briefId);
      await navigate({ to: "/studio/$threadId", params: { threadId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't hand that off.");
    }
  };

  const closed = prospect.follow_up_state === "closed";

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || closed}
          onClick={() => void run(logSent(prospect, undefined, campaignId), "Logged — next touch scheduled.")}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 font-medium text-primary-foreground disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Sent
        </button>
        <button
          type="button"
          disabled={busy || closed}
          onClick={() => {
            setShowReply((value) => !value);
            setShowCall(false);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-foreground hover:bg-muted disabled:opacity-40"
        >
          <MessageSquare className="h-4 w-4" /> Replied
        </button>
        <button
          type="button"
          disabled={busy || closed}
          onClick={() => {
            setShowCall((value) => !value);
            setShowReply(false);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-foreground hover:bg-muted disabled:opacity-40"
        >
          <CalendarCheck className="h-4 w-4" /> Call booked
        </button>
        {closed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(reopenFollowUp(prospect), "Back in the flow.")}
            className="h-9 rounded-full border border-border px-4 text-foreground hover:bg-muted"
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(closeFollowUp(prospect), "Closed out — no more nudges.")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" /> Not now
          </button>
        )}
      </div>

      {showReply ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {REPLY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() => void run(logReply(prospect, option.value, campaignId), "Reply logged.")}
              className="h-9 rounded-full border border-border bg-background px-4 text-foreground hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {showCall ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor={`call-${prospect.id}`} className="text-muted-foreground">
            When's the call?
          </label>
          <input
            id={`call-${prospect.id}`}
            type="datetime-local"
            value={callAt}
            onChange={(event) => setCallAt(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-foreground"
          />
          <button
            type="button"
            disabled={busy || !callAt}
            onClick={() =>
              void run(
                logCallBooked(prospect, new Date(callAt, campaignId).toISOString()),
                "Booked — Ace will nudge you before it.",
              )
            }
            className="h-9 rounded-full bg-primary px-4 font-medium text-primary-foreground disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground">
        {closed ? (
          <span>Closed out.</span>
        ) : prospect.follow_up_state === "booked" ? (
          <>
            <span>
              Call {prospect.call_at ? formatDue(prospect.call_at) : "booked"} · Ace is on standby
            </span>
            <button
              type="button"
              onClick={() => void openAgent("ace")}
              className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
            >
              <PenLine className="h-3.5 w-3.5" /> Prep the call
            </button>
          </>
        ) : (
          <>
            <span>
              Next: {nextStepLabel(prospect)} ·{" "}
              {prospect.next_action_at ? `due ${formatDue(prospect.next_action_at)}` : "no date yet"}
            </span>
            <button
              type="button"
              onClick={() => void openAgent("quill")}
              className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
            >
              <PenLine className="h-3.5 w-3.5" /> Draft it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(snoozeFollowUp(prospect, 3), "Snoozed 3 days.")}
              className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
            >
              <Clock className="h-3.5 w-3.5" /> Snooze 3 days
            </button>
          </>
        )}
      </div>
    </div>
  );
}
