import { ArrowLeft, ArrowRight, Check, Download, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SLOTS, type Campaign, type CampaignSlot } from "@/lib/campaigns";
import {
  DEFAULT_DRIPIFY_COLUMNS,
  DEFAULT_DRIPIFY_HEADERS,
  DRIPIFY_HEADER_PRESETS,
  download,
  dripifyCsv,
  slugify,
  SLOT_TO_FIELD,
  type DripifyColumns,
  type DripifyField,
  type DripifyHeaders,
} from "@/lib/exports";
import type { Prospect } from "@/lib/prospects";

const IDENTITY_FIELDS: { field: DripifyField; label: string; note: string }[] = [
  { field: "linkedin_url", label: "LinkedIn profile URL", note: "Required — Dripify keys every row on this." },
  { field: "first_name", label: "First name", note: "Split from the saved name." },
  { field: "last_name", label: "Last name", note: "Split from the saved name." },
  { field: "full_name", label: "Full name", note: "As saved." },
];

const OPTIONAL_FIELDS: { key: keyof DripifyColumns; field: DripifyField; label: string }[] = [
  { key: "company", field: "company", label: "Company" },
  { key: "title", field: "title", label: "Job title" },
  { key: "email", field: "email", label: "Email" },
];

const STEP_LABELS = ["Choose your steps", "Map the columns", "Review & download"];

export function DripifyWizard({
  campaign,
  prospects,
  personalised,
  onClose,
}: {
  campaign: Campaign;
  prospects: Prospect[];
  personalised: Map<string, string>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [columns, setColumns] = useState<DripifyColumns>(DEFAULT_DRIPIFY_COLUMNS);
  const [headers, setHeaders] = useState<DripifyHeaders>(DEFAULT_DRIPIFY_HEADERS);
  const [presetId, setPresetId] = useState("dripify");

  const result = useMemo(
    () => dripifyCsv(campaign, prospects, personalised, columns, headers),
    [campaign, prospects, personalised, columns, headers],
  );

  const chosenSlots = SLOTS.filter((meta) => columns[meta.slot]);
  const preview = result.rows.slice(0, 3);

  const applyPreset = (id: string) => {
    const preset = DRIPIFY_HEADER_PRESETS.find((entry) => entry.id === id);
    if (!preset) return;
    setPresetId(id);
    setHeaders(preset.headers);
  };

  const doDownload = () => {
    if (result.included.length === 0) {
      toast.error("Nobody in this campaign has a LinkedIn profile URL yet.");
      return;
    }
    download(`${slugify(campaign.name)}-dripify.csv`, result.csv);
    toast.success(
      `${result.included.length} row(s) exported${
        result.skipped.length ? ` · ${result.skipped.length} skipped` : ""
      }.`,
    );
    onClose();
  };

  return (
    <div className="paper-panel mt-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-foreground">Dripify export</h3>
          <p className="mt-1 text-muted-foreground">
            Step {step + 1} of 3 · {STEP_LABELS[step]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the Dripify export"
          className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <ol className="mt-4 flex flex-wrap gap-2">
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-4 py-1 ${
              index === step
                ? "bg-primary text-primary-foreground"
                : index < step
                  ? "bg-muted text-foreground"
                  : "border border-border text-muted-foreground"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="mt-6 space-y-4">
          <p className="text-muted-foreground">
            Each campaign step becomes one Dripify column. Tick what this Dripify campaign needs.
          </p>
          {SLOTS.map((meta) => {
            const missing = prospects.filter(
              (prospect) =>
                !(personalised.get(`${prospect.id}:${meta.slot}`) ?? campaign[meta.slot] ?? "").trim(),
            ).length;
            return (
              <label
                key={meta.slot}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4"
              >
                <input
                  type="checkbox"
                  checked={columns[meta.slot]}
                  onChange={(event) => setColumns({ ...columns, [meta.slot]: event.target.checked })}
                  className="mt-1 h-5 w-5 accent-[color:var(--primary)]"
                />
                <span>
                  <span className="text-foreground">{meta.label}</span>
                  <span className="block text-muted-foreground">{meta.hint}</span>
                  {missing > 0 ? (
                    <span className="mt-1 block text-destructive">
                      {missing} person(s) have nothing written for this step yet.
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}

          <div>
            <p className="text-foreground">Extra detail columns</p>
            <div className="mt-2 flex flex-wrap gap-4">
              {OPTIONAL_FIELDS.map((entry) => (
                <label key={entry.key} className="flex items-center gap-2 text-foreground">
                  <input
                    type="checkbox"
                    checked={columns[entry.key]}
                    onChange={(event) =>
                      setColumns({ ...columns, [entry.key]: event.target.checked })
                    }
                    className="h-5 w-5 accent-[color:var(--primary)]"
                  />
                  {entry.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            {DRIPIFY_HEADER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`h-9 rounded-full px-4 ${
                  presetId === preset.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground">
            Rename any header to match the column names your Dripify campaign expects.
          </p>

          <div className="space-y-3">
            {IDENTITY_FIELDS.map((entry) => (
              <HeaderRow
                key={entry.field}
                label={entry.label}
                note={entry.note}
                value={headers[entry.field]}
                onChange={(value) => {
                  setPresetId("custom");
                  setHeaders({ ...headers, [entry.field]: value });
                }}
              />
            ))}
            {OPTIONAL_FIELDS.filter((entry) => columns[entry.key]).map((entry) => (
              <HeaderRow
                key={entry.field}
                label={entry.label}
                note="Detail column."
                value={headers[entry.field]}
                onChange={(value) => {
                  setPresetId("custom");
                  setHeaders({ ...headers, [entry.field]: value });
                }}
              />
            ))}
            {chosenSlots.map((meta) => (
              <HeaderRow
                key={meta.slot}
                label={meta.label}
                note={`Campaign step → ${slotNote(meta.slot)}`}
                value={headers[SLOT_TO_FIELD[meta.slot]]}
                onChange={(value) => {
                  setPresetId("custom");
                  setHeaders({ ...headers, [SLOT_TO_FIELD[meta.slot]]: value });
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 space-y-4">
          <p className="text-muted-foreground">
            {result.included.length} row(s) ready
            {result.skipped.length
              ? ` · ${result.skipped.length} skipped for having no LinkedIn profile URL`
              : ""}
            .
          </p>

          {result.skipped.length > 0 ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-foreground">Skipped — add a LinkedIn URL to include them:</p>
              <p className="mt-1 text-muted-foreground">
                {result.skipped.map((prospect) => prospect.name).join(", ")}
              </p>
            </div>
          ) : null}

          {result.emptyMessages.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-muted-foreground">
              {result.emptyMessages.length} message cell(s) are still empty. Dripify will send a
              blank step — write the template or personalise those people first.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted">
                  {result.fields.map((field) => (
                    <th key={field} className="whitespace-nowrap px-3 py-2 text-foreground">
                      {headers[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.prospect.id} className="border-t border-border align-top">
                    {result.fields.map((field) => (
                      <td key={field} className="max-w-[18rem] px-3 py-2 text-muted-foreground">
                        {truncate(row.values[field])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.rows.length > preview.length ? (
            <p className="text-muted-foreground">
              Showing the first {preview.length} of {result.rows.length} rows.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          className="flex h-10 items-center gap-2 rounded-full border border-border px-5 text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={doDownload}
            className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Download Dripify CSV
          </button>
        )}
      </div>
    </div>
  );
}

function HeaderRow({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-[14rem] flex-1">
        <p className="text-foreground">{label}</p>
        <p className="text-muted-foreground">{note}</p>
      </div>
      <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`CSV column name for ${label}`}
        className="h-10 min-w-[12rem] flex-1 rounded-lg border border-input bg-background px-3 text-foreground"
      />
      <Check className="h-4 w-4 text-primary" />
    </div>
  );
}

function slotNote(slot: CampaignSlot): string {
  if (slot === "connection_note") return "sent with the connection request";
  if (slot === "message_1") return "sent once they accept";
  return "the follow-up step";
}

function truncate(value: string): string {
  return value.length > 90 ? `${value.slice(0, 90)}…` : value || "—";
}
