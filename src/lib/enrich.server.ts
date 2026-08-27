/** Fill in missing details (LinkedIn URL, title, company, site, blurb) for a person the founder already has. */

export type EnrichedPerson = {
  linkedin_url?: string;
  socials?: { platform: string; url: string }[];
  website?: string;
  email?: string;
  title?: string;
  company?: string;
  location?: string;
  blurb?: string;
  confidence?: "high" | "medium" | "low";
  confidence_reason?: string;
  citations: string[];
  notes?: string;
};

const ENRICH_SYSTEM = `You find the public professional profile of ONE named person so a founder can add them to an outreach list.
Rules:
- Only return details you can actually source on the public web right now. Omit anything you cannot verify.
- The most important field is a real LinkedIn profile URL (https://www.linkedin.com/in/...). Never guess a slug, never construct a URL from the person's name.
- Also return every other ACTIVE public social profile for this same person in "socials" as {"platform":"Instagram","url":"..."} — Instagram, Facebook, X, YouTube, TikTok, Threads, Substack. Only profiles you actually found and that clearly belong to this person; never guess a handle.
- Only include an email if it is genuinely published publicly. Otherwise omit it.
- "blurb" is one factual sentence about what they or their business actually do.
- "confidence": "high" when you are sure this is the same person (name plus company or title match on their own profile), "medium" when the match is likely but indirect, "low" when there may be several people with this name. Add a short "confidence_reason" (max 12 words).
- If you cannot confidently identify the person, return empty fields, confidence "low", and say why in "notes".
Return ONLY a JSON object:
{"linkedin_url":"","socials":[{"platform":"","url":""}],"website":"","email":"","title":"","company":"","location":"","blurb":"","confidence":"high","confidence_reason":"","notes":""}
No markdown fences, no commentary outside the JSON.`;

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const attempt = (value: string) => {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  const direct = attempt(cleaned);
  if (direct) return direct;
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return attempt(cleaned.slice(start, end + 1));
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || /^(n\/?a|unknown|none|null)$/i.test(trimmed)) return undefined;
  return trimmed;
}

export async function enrichPerson(input: {
  name: string;
  company?: string;
  title?: string;
  location?: string;
  hint?: string;
}): Promise<EnrichedPerson> {
  const apiKey = process.env["PERPLEXITY_API_KEY"];
  if (!apiKey) throw new Error("Profile lookup is not configured for this app.");

  const userPrompt = [
    `Find the public professional profile of: ${input.name}`,
    input.title ? `Their title, as given by the founder: ${input.title}` : "",
    input.company ? `Their company, as given by the founder: ${input.company}` : "",
    input.location ? `Location: ${input.location}` : "",
    input.hint ? `Extra context from the founder: ${input.hint}` : "",
    "Return their LinkedIn profile URL, website, title, company, location and a one-sentence blurb.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "sonar-pro",
      temperature: 0.1,
      messages: [
        { role: "system", content: ENRICH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("The lookup key was rejected. Check the Perplexity key.");
    }
    if (response.status === 429) {
      throw new Error("Profile lookup is rate limited right now — try again in a moment.");
    }
    throw new Error(`Profile lookup failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    citations?: string[];
    search_results?: { url?: string }[];
  };

  const parsed = extractJson(payload.choices?.[0]?.message?.content ?? "");
  const citations =
    payload.citations ?? (payload.search_results ?? []).map((r) => r.url ?? "").filter(Boolean);

  const result: EnrichedPerson = { citations };
  if (!parsed) return result;

  const linkedin = str(parsed["linkedin_url"]);
  if (linkedin && /linkedin\.com\/(in|company)\//i.test(linkedin)) result.linkedin_url = linkedin;
  for (const key of ["website", "email", "title", "company", "location", "blurb", "confidence_reason", "notes"] as const) {
    const value = str(parsed[key]);
    if (value) (result as Record<string, unknown>)[key] = value;
  }
  const socials = Array.isArray(parsed["socials"])
    ? (parsed["socials"] as unknown[])
        .map((item) => {
          const link = (item ?? {}) as Record<string, unknown>;
          const url = str(link["url"]);
          if (!url || !/^https?:\/\//i.test(url)) return null;
          return { platform: str(link["platform"]) ?? "Other", url };
        })
        .filter((item): item is { platform: string; url: string } => item !== null)
    : [];
  if (socials.length > 0) result.socials = socials;

  const confidence = str(parsed["confidence"]);
  if (confidence === "high" || confidence === "medium" || confidence === "low") {
    result.confidence = confidence;
  }
  return result;
}
