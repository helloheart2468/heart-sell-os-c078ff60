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

/** Dripify wants a LinkedIn profile URL per row plus any custom message columns. */
export function dripifyCsv(
  campaign: Campaign,
  prospects: Prospect[],
  personalised: Map<string, string>,
  columns: DripifyColumns = DEFAULT_DRIPIFY_COLUMNS,
): { csv: string; included: Prospect[]; skipped: Prospect[] } {
  const included = prospects.filter((prospect) => (prospect.linkedin_url ?? "").trim());
  const skipped = prospects.filter((prospect) => !(prospect.linkedin_url ?? "").trim());

  const header = ["linkedin_url", "first_name", "last_name", "full_name"];
  if (columns.company) header.push("company");
  if (columns.title) header.push("title");
  if (columns.email) header.push("email");
  if (columns.connection_note) header.push("connection_note");
  if (columns.message_1) header.push("message_1");
  if (columns.message_2) header.push("message_2");

  const rows: (string | null)[][] = [header];
  for (const prospect of included) {
    const { first, last } = splitName(prospect.name);
    const row: (string | null)[] = [prospect.linkedin_url, first, last, prospect.name];
    if (columns.company) row.push(prospect.company ?? "");
    if (columns.title) row.push(prospect.title ?? "");
    if (columns.email) row.push(prospect.email ?? "");
    const push = (slot: CampaignSlot) => row.push(bodyFor(campaign, slot, personalised, prospect.id));
    if (columns.connection_note) push("connection_note");
    if (columns.message_1) push("message_1");
    if (columns.message_2) push("message_2");
    rows.push(row);
  }

  return { csv: toCsv(rows), included, skipped };
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
