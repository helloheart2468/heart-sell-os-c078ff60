import { bodyFor, SLOTS, type Campaign, type CampaignSlot } from "@/lib/campaigns";
import type { DocBlock } from "@/lib/documents";
import { toCsv } from "@/lib/exports";
import type { Prospect } from "@/lib/prospects";

export type TeamPackOptions = {
  assignee: string;
  goal: string;
  slots: CampaignSlot[];
  notes?: string;
};

function slotLabel(slot: CampaignSlot): string {
  return SLOTS.find((entry) => entry.slot === slot)?.label ?? slot;
}

const RULES = [
  "Send exactly what is written here. If a message doesn't fit the person, flag it — don't rewrite the offer.",
  "Never pitch, price or link in the first message. It is a conversation ask, only.",
  "Personalise the name and the commonality line only, and only with something true you can see on their profile.",
  "If they reply, stop the sequence and log the reply straight away.",
  "If they ask a question you can't answer, or ask about price, hand it back rather than guessing.",
];

export function teamPackBlocks(
  campaign: Campaign,
  prospects: Prospect[],
  personalised: Map<string, string>,
  options: TeamPackOptions,
): DocBlock[] {
  const blocks: DocBlock[] = [
    { type: "title", text: `${campaign.name} — outreach pack` },
    {
      type: "subtitle",
      text: [
        options.assignee ? `Prepared for ${options.assignee}` : "",
        options.goal ? `This week's goal: ${options.goal}` : "",
        `${prospects.length} ${prospects.length === 1 ? "person" : "people"} · ${campaign.channel}`,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    { type: "h2", text: "Who these people are" },
    {
      type: "p",
      text:
        campaign.purpose === "event"
          ? `This is an invitation sequence for ${campaign.event_name || "an event"}${
              campaign.event_date ? ` on ${campaign.event_date}` : ""
            }. The ask is attendance, not a sale.`
          : "These are people we believe have a problem we genuinely solve. The ask in the first message is a conversation, never a sale.",
    },
  ];

  if (options.notes) blocks.push({ type: "p", text: options.notes });

  blocks.push({ type: "h2", text: "The rules" });
  for (const rule of RULES) blocks.push({ type: "bullet", text: rule });

  blocks.push({ type: "h2", text: "The messages" });
  for (const slot of options.slots) {
    blocks.push({ type: "p", text: slotLabel(slot) });
    blocks.push({ type: "quote", text: (campaign[slot] ?? "").trim() || "(no template written yet)" });
  }

  blocks.push({ type: "pagebreak" });
  blocks.push({ type: "h2", text: "The list" });

  prospects.forEach((prospect, index) => {
    if (index > 0) blocks.push({ type: "rule" });
    blocks.push({ type: "h2", text: `${index + 1}. ${prospect.name}` });
    const context = [prospect.title, prospect.company, prospect.location].filter(Boolean).join(" · ");
    if (context) blocks.push({ type: "p", text: context });
    if (prospect.why_fits) blocks.push({ type: "bullet", text: `Why they fit: ${prospect.why_fits}` });
    if (prospect.linkedin_url) blocks.push({ type: "bullet", text: `LinkedIn: ${prospect.linkedin_url}` });
    if (prospect.email) blocks.push({ type: "bullet", text: `Email: ${prospect.email}` });
    for (const slot of options.slots) {
      blocks.push({ type: "p", text: slotLabel(slot) });
      blocks.push({
        type: "quote",
        text: bodyFor(campaign, slot, personalised, prospect.id) || "(nothing drafted yet)",
      });
    }
    blocks.push({ type: "bullet", text: "Sent on ____________   ·   Reply? ____________" });
  });

  return blocks;
}

export function teamPackCsv(
  campaign: Campaign,
  prospects: Prospect[],
  personalised: Map<string, string>,
  options: TeamPackOptions,
): string {
  const header = [
    "assignee",
    "goal",
    "campaign",
    "channel",
    "name",
    "title",
    "company",
    "linkedin_url",
    "email",
    ...options.slots.map((slot) => slotLabel(slot)),
    "sent_on",
    "reply",
  ];
  const rows = prospects.map((prospect) => [
    options.assignee,
    options.goal,
    campaign.name,
    campaign.channel,
    prospect.name,
    prospect.title ?? "",
    prospect.company ?? "",
    prospect.linkedin_url ?? "",
    prospect.email ?? "",
    ...options.slots.map((slot) => bodyFor(campaign, slot, personalised, prospect.id)),
    "",
    "",
  ]);
  return toCsv([header, ...rows]);
}
