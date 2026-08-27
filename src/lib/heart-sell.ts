export type AgentId = "guide" | "sage" | "scout" | "quill" | "ace";

export type FieldType = "text" | "textarea" | "select";

export type StructuredField = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: string[];
  required?: boolean;
};

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  tagline: string;
  chapters: string;
  colorVar: string;
  structuredTitle: string;
  structuredIntro: string;
  chatOpener: string;
  starters: string[];
  fields: StructuredField[];
};

export const AUDIENCE_OPTIONS = [
  "Ideal Clients",
  "Potential Partners",
  "Ecosystem Contacts",
];

export const TEMPERATURE_OPTIONS = ["Hot", "Warm", "Cold", "All three"];

export const CHANNEL_OPTIONS = [
  "LinkedIn DM",
  "Email",
  "Instagram DM",
  "Text",
  "Phone",
];

export const AGENTS: Record<AgentId, Agent> = {
  guide: {
    id: "guide",
    name: "Heart Sell",
    role: "Open chat",
    tagline:
      "Think out loud about anything in the method — the guide answers, then points you to Sage, Scout, Quill or Ace when it's time to do the work.",
    chapters: "The whole workbook",
    colorVar: "primary",
    structuredTitle: "Open chat",
    structuredIntro: "",
    chatOpener: "What are we working on today?",
    starters: [
      "Where should I start?",
      "Explain the Heart Sell method to me",
      "Who should I be reaching out to this week?",
      "Review my sales approach",
    ],
    fields: [],
  },
  sage: {
    id: "sage",
    name: "Sage",
    role: "Audience Audit & onboarding brief",
    tagline:
      "Maps your expertise, your broken phone, and all three outbound audiences so every other tool has something true to work from.",
    chapters: "Chapters 1-4 · Q×Q=R · The Audience Audit",
    colorVar: "sage",
    structuredTitle: "Audience Audit brief",
    structuredIntro:
      "Answer what you can — Sage will pressure-test the vague parts and write the finished brief. This becomes the foundation Scout, Quill and Ace read from.",
    chatOpener:
      "Let's build your Audience Audit the way Dora runs it in cohort — one honest question at a time. Start wherever you like: what problems do you actually solve, and for whom?",
    starters: [
      "Walk me through the Audience Audit from the top",
      "My ICP is too broad — help me narrow it",
      "Help me name my broken phone",
      "Map my strategic partners and ecosystems",
    ],
    fields: [
      {
        name: "business_summary",
        label: "What is your business, in plain language?",
        type: "textarea",
        placeholder: "What you sell, to whom, and how you deliver it.",
        required: true,
      },
      {
        name: "problems_solved",
        label: "What problems do you solve?",
        type: "textarea",
        help: "Not the service description — the actual transformation or relief. Include problems they don't yet know they have.",
      },
      {
        name: "unfair_advantage",
        label: "Your unfair advantage",
        type: "textarea",
        placeholder: "What you bring that nobody else brings in quite the same way.",
      },
      {
        name: "broken_phone",
        label: "Their broken phone",
        type: "textarea",
        help: "The specific, urgent problem your people already know they need fixed — the one that makes them pick up the phone.",
      },
      {
        name: "icp_description",
        label: "Your dreamiest ideal client, as a real person or company",
        type: "textarea",
        placeholder: "Be uncomfortably specific. What makes them a great fit beyond 'they can pay me'?",
      },
      {
        name: "icp_titles",
        label: "Titles / roles in the buying committee",
        type: "textarea",
        placeholder: "Primary buyers (own the budget) and secondary buyers (influence or use the service).",
      },
      {
        name: "care_fear_need",
        label: "For each title: what they care about, fear, and need to hear",
        type: "textarea",
        help: "The highest-leverage exercise in the whole audit. One line per title is fine — Sage will build the full table.",
      },
      {
        name: "pain_points",
        label: "Core pain points",
        type: "textarea",
        placeholder: "The inflection point, the erosion if nothing changes, the cost, and why alternatives fail.",
      },
      {
        name: "desired_outcomes",
        label: "Desired outcomes",
        type: "textarea",
        placeholder: "What life or business looks like after working with you.",
      },
      {
        name: "partner_types",
        label: "Strategic partners",
        type: "textarea",
        help: "Who has the same audience as you but does something meaningfully different? Types or real names.",
      },
      {
        name: "ecosystems",
        label: "Ecosystems",
        type: "textarea",
        help: "Associations, conferences, communities, boards, stages and podcasts — ones you're in, and ones you want in.",
      },
      {
        name: "buyer_filters",
        label: "Ideal buyer filters",
        type: "textarea",
        placeholder: "Observable evidence that a lead is genuinely worth pursuing.",
      },
      {
        name: "offer_summary",
        label: "Your offers, timeline and pricing",
        type: "textarea",
        placeholder: "Deliverables, length, investment — the raw material for a simple pitch.",
      },
      {
        name: "story_notes",
        label: "Story notes (credentials + vulnerability)",
        type: "textarea",
        placeholder: "Raw material for your 3-5 minute story in Step 5 of the conversation.",
      },
    ],
  },
  scout: {
    id: "scout",
    name: "Scout",
    role: "Nine Lists & ecosystem builder",
    tagline:
      "Builds prospect categories, buyer filters and temperature-sorted lists for ideal clients, partners and ecosystems.",
    chapters: "Chapter 5 · The Nine Lists · Chapter 18 · Ecosystems",
    colorVar: "scout",
    structuredTitle: "Build a list",
    structuredIntro:
      "Scout works from your Audience Audit. Tell it which of the nine lists you're filling and it returns prospect categories, why they fit, likely buyers, and search moves to find real names.",
    chatOpener:
      "Which of the nine lists are we filling today — ideal clients, potential partners, or ecosystem contacts? And how warm are they to you right now?",
    starters: [
      "Build my cold ideal-client list",
      "Find strategic partner categories for me",
      "Which ecosystems should I be inside?",
      "Sort the names I already have by temperature",
    ],
    fields: [
      {
        name: "audience",
        label: "Which audience?",
        type: "select",
        options: AUDIENCE_OPTIONS,
        required: true,
      },
      {
        name: "temperature",
        label: "Temperature",
        type: "select",
        options: TEMPERATURE_OPTIONS,
        required: true,
      },
      {
        name: "market",
        label: "Market, geography or industry focus",
        type: "text",
        placeholder: "e.g. boutique hospitality, US Midwest, non-profits over $5M",
      },
      {
        name: "count",
        label: "How many entries do you want?",
        type: "text",
        placeholder: "e.g. 15",
      },
      {
        name: "existing",
        label: "Names or notes you already have",
        type: "textarea",
        placeholder: "Paste contacts, companies or communities to sort and enrich.",
      },
      {
        name: "filters",
        label: "Extra buyer filters for this pass",
        type: "textarea",
        placeholder: "Observable signals that qualify a name onto this list.",
      },
    ],
  },
  quill: {
    id: "quill",
    name: "Quill",
    role: "CCRA outreach writer",
    tagline:
      "Drafts pitch-free Commonality, Compliment, Reason, Ask messages and full 7-Day Sales Path sequences in your voice.",
    chapters: "Chapters 7-8 · CCRA · The 7-Day Sales Path",
    colorVar: "quill",
    structuredTitle: "Draft outreach",
    structuredIntro:
      "Quill never pitches in Message 1 and never invents a commonality. Give it the real research and it returns the three-message sequence with timing.",
    chatOpener:
      "Who are we writing to, and what did you actually notice about them? Real research first — I won't manufacture a commonality.",
    starters: [
      "Write a CCRA message to this contact",
      "Draft my full 7-Day sequence for partners",
      "My message sounds like a pitch — fix it",
      "Write Message 2, the tap on the shoulder",
    ],
    fields: [
      {
        name: "contact",
        label: "Who are you writing to?",
        type: "text",
        placeholder: "Name, role, company",
        required: true,
      },
      {
        name: "audience",
        label: "Which audience are they?",
        type: "select",
        options: AUDIENCE_OPTIONS,
        required: true,
      },
      {
        name: "channel",
        label: "Channel for Message 1",
        type: "select",
        options: CHANNEL_OPTIONS,
      },
      {
        name: "research",
        label: "Your research — source and what you saw",
        type: "textarea",
        help: "A post, an article, a mutual connection, an event. Quill only uses what's true here.",
        required: true,
      },
      {
        name: "commonality",
        label: "Real commonality",
        type: "textarea",
        placeholder: "Shared community, circle, event or content. Leave blank if you're not sure yet.",
      },
      {
        name: "compliment",
        label: "The specific thing you admire",
        type: "textarea",
        placeholder: "The exact post, decision or result — not 'I love what you do'.",
      },
      {
        name: "times",
        label: "Two specific times you can offer",
        type: "text",
        placeholder: "e.g. Tuesday 10am ET or Thursday 2pm ET",
      },
      {
        name: "sequence",
        label: "What do you want?",
        type: "select",
        options: [
          "Full 3-message 7-Day sequence",
          "Message 1 only (CCRA)",
          "Message 2 — tap on the shoulder",
          "Message 3 — the closeout",
        ],
      },
    ],
  },
  ace: {
    id: "ace",
    name: "Ace",
    role: "Call prep & conversation coach",
    tagline:
      "Preps the 7-Step Heart Sell Conversation: agenda, three outcomes, three levels of profiling questions, your story, summary and pitch.",
    chapters: "Chapters 11-15 · The 7-Step Conversation · Three-Level Profiling",
    colorVar: "ace",
    structuredTitle: "Prep a call",
    structuredIntro:
      "Ace builds your prep sheet from the Audience Audit: rapport notes, agenda language, the three outcomes, profiling questions at all three levels, your story beats, and a simple pitch.",
    chatOpener:
      "Who's the call with, and what do you already know about them? I'll build your prep sheet and then we can rehearse any step you want.",
    starters: [
      "Prep me for a discovery call",
      "Write Level 3 urgency questions",
      "Rehearse the summary and permission ask",
      "They said 'let me think about it' — what now?",
    ],
    fields: [
      {
        name: "contact",
        label: "Who is the call with?",
        type: "text",
        placeholder: "Name, role, company",
        required: true,
      },
      {
        name: "call_type",
        label: "Type of conversation",
        type: "select",
        options: [
          "Outbound discovery call",
          "Inbound inquiry call",
          "Strategic partner conversation",
          "Follow-up / second conversation",
        ],
        required: true,
      },
      {
        name: "known",
        label: "What you already know about them",
        type: "textarea",
        placeholder: "Research, prior messages, referral context, their business.",
      },
      {
        name: "suspected_problem",
        label: "Suspected broken phone",
        type: "textarea",
        placeholder: "The pressing problem you think they'd name themselves.",
      },
      {
        name: "offer",
        label: "Offer you'd likely pitch (deliverables, timeline, price)",
        type: "textarea",
      },
      {
        name: "concerns",
        label: "Objections or nerves you're expecting",
        type: "textarea",
        placeholder: "Price, timing, another decision-maker, your own hesitation.",
      },
    ],
  },
};

export const AGENT_LIST: Agent[] = [
  AGENTS.sage,
  AGENTS.scout,
  AGENTS.quill,
  AGENTS.ace,
];

export function isAgentId(value: string): value is AgentId {
  return (
    value === "guide" ||
    value === "sage" ||
    value === "scout" ||
    value === "quill" ||
    value === "ace"
  );
}

export function buildStructuredMessage(
  agentId: AgentId,
  values: Record<string, string>,
): string {
  const agent = AGENTS[agentId];
  const lines = agent.fields
    .filter((field) => (values[field.name] ?? "").trim().length > 0)
    .map((field) => `**${field.label}**\n${values[field.name]!.trim()}`);

  return [
    `Structured ${agent.structuredTitle.toLowerCase()} request:`,
    "",
    lines.join("\n\n"),
  ].join("\n");
}
