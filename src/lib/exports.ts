import { bodyFor, type Campaign, type CampaignSlot } from "@/lib/campaigns";
import { formatDue } from "@/lib/followups";
import type { Prospect } from "@/lib/prospects";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\n")}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function download(filename: string, contents: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export type DripifyColumns = {
  connection_note: boolean;
  message_1: boolean;
  message_2: boolean;
  company: boolean;
  title: boolean;
  email: boolean;
};

export const DEFAULT_DRIPIFY_COLUMNS: DripifyColumns = {
  connection_note: true,
  message_1: true,
  message_2: true,
  company: true,
  title: true,
  email: false,
};

/** Field keys in the order Dripify reads them. */
export type DripifyField =
  | "linkedin_url"
  | "first_name"
  | "last_name"
  | "full_name"
  | "company"
  | "title"
  | "email"
  | "connection_note"
  | "message_1"
  | "message_2";

export type DripifyHeaders = Record<DripifyField, string>;

/** Dripify's own column names. The wizard lets people rename these to match their account. */
export const DRIPIFY_HEADER_PRESETS: { id: string; label: string; headers: DripifyHeaders }[] = [
  {
    id: "dripify",
    label: "Dripify default",
    headers: {
      linkedin_url: "Profile Url",
      first_name: "First Name",
      last_name: "Last Name",
      full_name: "Full Name",
      company: "Company",
      title: "Job Title",
      email: "Email",
      connection_note: "Custom1",
      message_1: "Custom2",
      message_2: "Custom3",
    },
  },
  {
    id: "descriptive",
    label: "Readable names",
    headers: {
      linkedin_url: "Profile Url",
      first_name: "First Name",
      last_name: "Last Name",
      full_name: "Full Name",
      company: "Company",
      title: "Job Title",
      email: "Email",
      connection_note: "Connection Note",
      message_1: "Message 1",
      message_2: "Message 2",
    },
  },
  {
    id: "snake",
    label: "Lowercase keys",
    headers: {
      linkedin_url: "linkedin_url",
      first_name: "first_name",
      last_name: "last_name",
      full_name: "full_name",
      company: "company",
      title: "title",
      email: "email",
      connection_note: "connection_note",
      message_1: "message_1",
      message_2: "message_2",
    },
  },
];

export const DEFAULT_DRIPIFY_HEADERS: DripifyHeaders = DRIPIFY_HEADER_PRESETS[0]!.headers;

/** Which campaign step feeds which Dripify column. */
export const SLOT_TO_FIELD: Record<CampaignSlot, DripifyField> = {
  connection_note: "connection_note",
  message_1: "message_1",
  message_2: "message_2",
};

export type DripifyRow = { prospect: Prospect; values: Record<DripifyField, string> };

export type DripifyResult = {
  csv: string;
  fields: DripifyField[];
  rows: DripifyRow[];
  included: Prospect[];
  skipped: Prospect[];
  emptyMessages: { prospect: Prospect; slot: CampaignSlot }[];
};

/** Dripify wants a LinkedIn profile URL per row plus any custom message columns. */
export function dripifyCsv(
  campaign: Campaign,
  prospects: Prospect[],
  personalised: Map<string, string>,
  columns: DripifyColumns = DEFAULT_DRIPIFY_COLUMNS,
  headers: DripifyHeaders = DEFAULT_DRIPIFY_HEADERS,
): DripifyResult {
  const included = prospects.filter((prospect) => (prospect.linkedin_url ?? "").trim());
  const skipped = prospects.filter((prospect) => !(prospect.linkedin_url ?? "").trim());

  const fields: DripifyField[] = ["linkedin_url", "first_name", "last_name", "full_name"];
  if (columns.company) fields.push("company");
  if (columns.title) fields.push("title");
  if (columns.email) fields.push("email");
  if (columns.connection_note) fields.push("connection_note");
  if (columns.message_1) fields.push("message_1");
  if (columns.message_2) fields.push("message_2");

  const emptyMessages: { prospect: Prospect; slot: CampaignSlot }[] = [];
  const rows: DripifyRow[] = included.map((prospect) => {
    const { first, last } = splitName(prospect.name);
    const message = (slot: CampaignSlot) => {
      const body = bodyFor(campaign, slot, personalised, prospect.id).trim();
      if (!body) emptyMessages.push({ prospect, slot });
      return body;
    };
    const values: Record<DripifyField, string> = {
      linkedin_url: prospect.linkedin_url ?? "",
      first_name: first,
      last_name: last,
      full_name: prospect.name,
      company: prospect.company ?? "",
      title: prospect.title ?? "",
      email: prospect.email ?? "",
      connection_note: columns.connection_note ? message("connection_note") : "",
      message_1: columns.message_1 ? message("message_1") : "",
      message_2: columns.message_2 ? message("message_2") : "",
    };
    return { prospect, values };
  });

  const csv = toCsv([
    fields.map((field) => headers[field]),
    ...rows.map((row) => fields.map((field) => row.values[field])),
  ]);

  return { csv, fields, rows, included, skipped, emptyMessages };
}

export type VaRow = {
  prospect: Prospect;
  message: string;
  channel: string;
  campaignName: string;
};

export function vaCsv(rows: VaRow[]): string {
  const out: (string | null)[][] = [
    [
      "name",
      "title",
      "company",
      "linkedin_url",
      "email",
      "channel",
      "campaign",
      "message_to_send",
      "due",
      "status",
    ],
  ];
  for (const row of rows) {
    out.push([
      row.prospect.name,
      row.prospect.title ?? "",
      row.prospect.company ?? "",
      row.prospect.linkedin_url ?? "",
      row.prospect.email ?? "",
      row.channel,
      row.campaignName,
      row.message,
      row.prospect.next_action_at ? formatDue(row.prospect.next_action_at) : "",
      row.prospect.follow_up_state,
    ]);
  }
  return toCsv(out);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Printable checklist: one block per person, message ready to copy, tick box. */
export function checklistHtml(title: string, rows: VaRow[]): string {
  const blocks = rows
    .map((row) => {
      const context = [row.prospect.title, row.prospect.company, row.prospect.location]
        .filter(Boolean)
        .join(" · ");
      const links = [
        row.prospect.linkedin_url ? `LinkedIn: ${row.prospect.linkedin_url}` : "",
        row.prospect.email ? `Email: ${row.prospect.email}` : "",
      ]
        .filter(Boolean)
        .join(" &nbsp;|&nbsp; ");
      return `<article>
  <header><span class="box"></span><h2>${escapeHtml(row.prospect.name)}</h2></header>
  <p class="meta">${escapeHtml(context)}</p>
  ${row.prospect.why_fits ? `<p class="meta">Why they fit: ${escapeHtml(row.prospect.why_fits)}</p>` : ""}
  ${links ? `<p class="meta">${links}</p>` : ""}
  <pre>${escapeHtml(row.message || "(no message drafted yet)")}</pre>
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prata&family=Montserrat:wght@400;600&display=swap" />
<style>
  body { font-family: Montserrat, sans-serif; font-size: 16px; color: #222226; margin: 32px; }
  h1 { font-family: Prata, serif; font-size: 30px; color: #f21882; margin-bottom: 4px; }
  .sub { color: #6b6b73; margin-top: 0; }
  article { border-top: 1px solid #e6e0e2; padding: 18px 0; page-break-inside: avoid; }
  header { display: flex; align-items: center; gap: 12px; }
  h2 { font-family: Prata, serif; font-size: 21px; margin: 0; }
  .box { width: 18px; height: 18px; border: 2px solid #f21882; border-radius: 4px; display: inline-block; flex: none; }
  .meta { color: #6b6b73; margin: 6px 0 0; font-size: 16px; }
  pre { white-space: pre-wrap; font-family: Montserrat, sans-serif; font-size: 16px; background: #fdf2f7; border-left: 3px solid #f21882; padding: 12px 14px; margin-top: 12px; border-radius: 6px; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="sub">${rows.length} to send · print or save as PDF</p>
${blocks}
</body></html>`;
}

export function openChecklist(title: string, rows: VaRow[]) {
  const html = checklistHtml(title, rows);
  const win = window.open("", "_blank");
  if (!win) {
    download(`${slugify(title)}-checklist.html`, html, "text/html;charset=utf-8");
    return;
  }
  win.document.write(html);
  win.document.close();
}
