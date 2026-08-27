export type FoundProspect = {
  name: string;
  title?: string;
  company?: string;
  blurb?: string;
  location?: string;
  linkedin_url?: string;
  social_url?: string;
  website?: string;
  email?: string;
  why_fits?: string;
  temperature?: string;
  sources?: string[];
};

export type ProspectSearchResult = {
  prospects: FoundProspect[];
  notes?: string;
  citations: string[];
};

const SYSTEM = `You are a B2B prospect researcher. You return only real, currently-verifiable people and organizations found on the public web.
Rules:
- Never invent a person, company, title, URL or email. If you cannot verify a field, omit it.
- Prefer a real LinkedIn profile URL. If none is findable, give the best public social or company profile URL instead.
- Only include an email if it is genuinely published publicly (company contact pages, association directories, speaker pages). Otherwise omit it.
- Each entry needs a short factual blurb (1-2 sentences) about what they/their business actually do, and a one-line reason they fit the brief.
- Prefer decision-makers and owners over junior staff.
Return ONLY a JSON object of the shape:
{"prospects":[{"name":"","title":"","company":"","blurb":"","location":"","linkedin_url":"","social_url":"","website":"","email":"","why_fits":""}],"notes":""}
No markdown fences, no commentary outside the JSON.`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || /^(n\/?a|unknown|none|null)$/i.test(trimmed)) return undefined;
  return trimmed;
}

export async function searchProspects(input: {
  brief: string;
  count: number;
  region?: string;
  audience?: string;
}): Promise<ProspectSearchResult> {
  const apiKey = process.env["PERPLEXITY_API_KEY"];
  if (!apiKey) throw new Error("Prospect search is not configured for this app.");

  const count = Math.max(3, Math.min(25, Math.round(input.count || 10)));
  const userPrompt = [
    `Find ${count} real ${input.audience ?? "prospects"} matching this brief:`,
    input.brief,
    input.region ? `Geography / market focus: ${input.region}` : "",
    "For each one give: name, title, company, a short factual blurb, location, LinkedIn URL (or best public profile), website, publicly listed email if one genuinely exists, and why they fit.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new Error("The prospect search key was rejected. Check the Perplexity key.");
    }
    if (response.status === 429) {
      throw new Error("Prospect search is rate limited right now — try again in a moment.");
    }
    throw new Error(`Prospect search failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
    search_results?: { url?: string }[];
  };

  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content) as
    | { prospects?: unknown[]; notes?: string }
    | null;

  const citations =
    payload.citations ??
    (payload.search_results ?? []).map((r) => r.url ?? "").filter(Boolean);

  const prospects: FoundProspect[] = Array.isArray(parsed?.prospects)
    ? parsed!.prospects
        .map((raw) => {
          const row = (raw ?? {}) as Record<string, unknown>;
          const name = str(row["name"]);
          if (!name) return null;
          const entry: FoundProspect = { name };
          const map: [keyof FoundProspect, string][] = [
            ["title", "title"],
            ["company", "company"],
            ["blurb", "blurb"],
            ["location", "location"],
            ["linkedin_url", "linkedin_url"],
            ["social_url", "social_url"],
            ["website", "website"],
            ["email", "email"],
            ["why_fits", "why_fits"],
          ];
          for (const [key, source] of map) {
            const value = str(row[source]);
            if (value) (entry as Record<string, unknown>)[key] = value;
          }
          return entry;
        })
        .filter((entry): entry is FoundProspect => entry !== null)
    : [];

  const result: ProspectSearchResult = { prospects, citations };
  const notes = str(parsed?.notes);
  if (notes) result.notes = notes;
  return result;
}

export type ResearchHook = { text: string; source?: string };

export type ProspectResearchResult = {
  person: string;
  commonalities: ResearchHook[];
  compliments: ResearchHook[];
  recent_signals: ResearchHook[];
  citations: string[];
  notes?: string;
};

const RESEARCH_SYSTEM = `You research ONE named person so a founder can write an honest, personal first message.
Rules:
- Only report things you can actually source on the public web right now. If you cannot source it, leave it out.
- Never guess, never generalise ("she seems passionate about..."), never flatter. Facts only.
- "commonalities" are genuine points of overlap between the founder and this person: shared city or region, shared association/community/group, shared alumni or employer history, same event, mutual industry niche. Only include one if the founder's own background (given below) genuinely overlaps.
- "compliments" are specific, observable, verifiable things about their work: a named service, a launch, an award, a milestone, a talk, a piece of press, a published result.
- "recent_signals" are timely happenings in the last ~12 months worth referencing.
- Each item: a short one-sentence "text" plus the "source" URL it came from. Omit any item without a source URL.
- If you genuinely find nothing solid, return empty arrays and explain briefly in "notes".
Return ONLY a JSON object:
{"commonalities":[{"text":"","source":""}],"compliments":[{"text":"","source":""}],"recent_signals":[{"text":"","source":""}],"notes":""}
No markdown fences, no commentary outside the JSON.`;

function hooks(raw: unknown): ResearchHook[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const text = str(row["text"]);
      if (!text) return null;
      const source = str(row["source"]);
      return source ? { text, source } : { text };
    })
    .filter((item): item is ResearchHook => item !== null)
    .slice(0, 6);
}

export async function researchProspect(input: {
  name: string;
  company?: string;
  title?: string;
  location?: string;
  link?: string;
  founderContext?: string;
}): Promise<ProspectResearchResult> {
  const apiKey = process.env["PERPLEXITY_API_KEY"];
  if (!apiKey) throw new Error("Prospect research is not configured for this app.");

  const userPrompt = [
    `Research this person: ${input.name}`,
    input.title ? `Title: ${input.title}` : "",
    input.company ? `Company: ${input.company}` : "",
    input.location ? `Location: ${input.location}` : "",
    input.link ? `Known profile: ${input.link}` : "",
    input.founderContext
      ? `The founder reaching out: ${input.founderContext}\nUse this to judge whether an overlap is a REAL commonality.`
      : "",
    "Find genuine commonalities, specific compliments, and recent signals, each with a source URL.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      temperature: 0.2,
      messages: [
        { role: "system", content: RESEARCH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 && detail.includes("insufficient_quota")) {
      throw new Error(
        "The research credits for this app are used up. Add API credits at console.perplexity.ai for the connected account.",
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("The research key was rejected. Check the Perplexity key.");
    }
    if (response.status === 429) {
      throw new Error("Research is rate limited right now — try again in a moment.");
    }
    throw new Error(`Research failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
    search_results?: { url?: string }[];
  };

  const parsed = extractJson(payload.choices?.[0]?.message?.content ?? "") as
    | Record<string, unknown>
    | null;

  const citations =
    payload.citations ??
    (payload.search_results ?? []).map((r) => r.url ?? "").filter(Boolean);

  const result: ProspectResearchResult = {
    person: input.name,
    commonalities: hooks(parsed?.["commonalities"]),
    compliments: hooks(parsed?.["compliments"]),
    recent_signals: hooks(parsed?.["recent_signals"]),
    citations: citations.slice(0, 10),
  };
  const notes = str(parsed?.["notes"]);
  if (notes) result.notes = notes;
  return result;
}
