/** Client-side CSV / pasted-table parsing for "upload your own list". */

export type ImportField =
  | "name"
  | "title"
  | "company"
  | "linkedin_url"
  | "instagram_url"
  | "facebook_url"
  | "other_social_url"
  | "email"
  | "website"
  | "location"
  | "notes"
  | "ignore";

export const IMPORT_FIELDS: { field: ImportField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "title", label: "Title" },
  { field: "company", label: "Company" },
  { field: "linkedin_url", label: "LinkedIn URL" },
  { field: "instagram_url", label: "Instagram" },
  { field: "facebook_url", label: "Facebook" },
  { field: "other_social_url", label: "Other social (X, TikTok, YouTube…)" },
  { field: "email", label: "Email" },
  { field: "website", label: "Website" },
  { field: "location", label: "Location" },
  { field: "notes", label: "Notes" },
  { field: "ignore", label: "Don't import" },
];

/** RFC-4180-ish parser: handles quotes, embedded commas and newlines. Falls back to tabs. */
export function parseDelimited(text: string): string[][] {
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!source) return [];
  const firstLine = source.split("\n")[0] ?? "";
  const delimiter =
    firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  rows.push(row);

  return rows.filter((entry) => entry.some((value) => value !== ""));
}

const PATTERNS: { field: ImportField; test: RegExp }[] = [
  { field: "linkedin_url", test: /linked|li[\s_-]*url/i },
  { field: "instagram_url", test: /instagram|(^|\W)ig(\W|$)/i },
  { field: "facebook_url", test: /facebook|(^|\W)fb(\W|$)|messenger/i },
  { field: "other_social_url", test: /twitter|(^|\W)x(\W|$)|tiktok|youtube|threads|social|handle/i },
  { field: "email", test: /e-?mail/i },
  { field: "website", test: /web|site|url|domain/i },
  { field: "title", test: /title|role|position|job/i },
  { field: "company", test: /company|organisation|organization|business|employer|account/i },
  { field: "location", test: /location|city|country|region|based/i },
  { field: "notes", test: /note|comment|context|why|blurb|about/i },
  { field: "name", test: /^(full\s*)?name$|contact|person|prospect/i },
];

export function guessMapping(headers: string[]): ImportField[] {
  const used = new Set<ImportField>();
  const mapping = headers.map((header) => {
    const clean = header.trim();
    for (const { field, test } of PATTERNS) {
      if (used.has(field)) continue;
      if (test.test(clean)) {
        used.add(field);
        return field;
      }
    }
    return "ignore" as ImportField;
  });

  // First and last name columns → combine into name later; here just pick a name column.
  if (!used.has("name")) {
    const firstIndex = headers.findIndex((header) => /first/i.test(header));
    if (firstIndex >= 0) mapping[firstIndex] = "name";
  }
  return mapping;
}

export type ImportRow = {
  name: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  other_social_url?: string;
  email?: string;
  website?: string;
  location?: string;
  notes?: string;
};

export function buildRows(
  table: string[][],
  mapping: ImportField[],
  hasHeader: boolean,
): ImportRow[] {
  const body = hasHeader ? table.slice(1) : table;
  const lastNameIndex = hasHeader
    ? (table[0] ?? []).findIndex((header) => /last|surname/i.test(header))
    : -1;

  const rows: ImportRow[] = [];
  for (const line of body) {
    const record: Record<string, string> = {};
    mapping.forEach((field, index) => {
      if (field === "ignore") return;
      const value = (line[index] ?? "").trim();
      if (value) record[field] = value;
    });
    let name = record["name"] ?? "";
    if (lastNameIndex >= 0 && mapping[lastNameIndex] === "ignore") {
      const last = (line[lastNameIndex] ?? "").trim();
      if (last && !name.includes(last)) name = `${name} ${last}`.trim();
    }
    if (!name) continue;
    const row: ImportRow = { name };
    for (const key of [
      "title",
      "company",
      "linkedin_url",
      "instagram_url",
      "facebook_url",
      "other_social_url",
      "email",
      "website",
      "location",
      "notes",
    ] as const) {
      const value = record[key];
      if (value) row[key] = value;
    }
    rows.push(row);
  }
  return rows;
}

function normaliseLinkedIn(url?: string): string {
  return (url ?? "").toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\/(www\.)?/, "");
}

export function splitDuplicates(
  rows: ImportRow[],
  existing: { name: string; company: string | null; linkedin_url: string | null }[],
): { fresh: ImportRow[]; duplicates: ImportRow[] } {
  const byLinkedIn = new Set(
    existing.map((row) => normaliseLinkedIn(row.linkedin_url ?? "")).filter(Boolean),
  );
  const byNameCompany = new Set(
    existing.map((row) => `${row.name.toLowerCase().trim()}|${(row.company ?? "").toLowerCase().trim()}`),
  );

  const fresh: ImportRow[] = [];
  const duplicates: ImportRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const li = normaliseLinkedIn(row.linkedin_url);
    const key = `${row.name.toLowerCase().trim()}|${(row.company ?? "").toLowerCase().trim()}`;
    const isDuplicate =
      (li && (byLinkedIn.has(li) || seen.has(li))) || byNameCompany.has(key) || seen.has(key);
    if (isDuplicate) {
      duplicates.push(row);
      continue;
    }
    if (li) seen.add(li);
    seen.add(key);
    fresh.push(row);
  }
  return { fresh, duplicates };
}
