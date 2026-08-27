import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildRows,
  guessMapping,
  IMPORT_FIELDS,
  parseDelimited,
  splitDuplicates,
  type ImportField,
  type ImportRow,
} from "@/lib/csv-import";
import { AUDIENCE_OPTIONS } from "@/lib/heart-sell";
import {
  createProspectList,
  listProspects,
  saveProspects,
  type ProspectList,
} from "@/lib/prospects";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: ProspectList[];
  briefId: string | null;
  onImported: (listId: string, count: number) => void;
};

export function ListUpload({ open, onOpenChange, lists, briefId, onImported }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [destination, setDestination] = useState<string>("new");
  const [newListName, setNewListName] = useState("Uploaded list");
  const [audience, setAudience] = useState(AUDIENCE_OPTIONS[0] as string);
  const [temperature, setTemperature] = useState("Cold");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [saving, setSaving] = useState(false);

  const table = useMemo(() => parseDelimited(raw), [raw]);
  const headers = hasHeader ? table[0] ?? [] : (table[0] ?? []).map((_, i) => `Column ${i + 1}`);

  const load = (text: string) => {
    setRaw(text);
    const parsed = parseDelimited(text);
    const first = parsed[0] ?? [];
    setMapping(guessMapping(first));
  };

  const rows: ImportRow[] = useMemo(() => {
    if (table.length === 0 || mapping.length === 0) return [];
    return buildRows(table, mapping, hasHeader);
  }, [table, mapping, hasHeader]);

  const reset = () => {
    setRaw("");
    setMapping([]);
    setDestination("new");
    setNewListName("Uploaded list");
  };

  const submit = async () => {
    if (rows.length === 0) {
      toast.error("Nothing to import yet — check your column mapping.");
      return;
    }
    setSaving(true);
    try {
      const existing = await listProspects(undefined, null);
      const { fresh, duplicates } = splitDuplicates(rows, existing);
      const toSave = skipDuplicates ? fresh : rows;
      if (toSave.length === 0) {
        toast.error("Everyone in this file is already on your lists.");
        return;
      }

      let listId = destination;
      if (destination === "new") {
        const created = await createProspectList({
          name: newListName.trim() || "Uploaded list",
          audience,
          temperature,
          brief_id: briefId,
        });
        listId = created.id;
      }

      await saveProspects(
        toSave.map((row) => ({
          name: row.name,
          ...(row.title ? { title: row.title } : {}),
          ...(row.company ? { company: row.company } : {}),
          ...(row.linkedin_url ? { linkedin_url: row.linkedin_url } : {}),
          ...(() => {
            const socials = [
              row.instagram_url ? { platform: "Instagram", url: row.instagram_url } : null,
              row.facebook_url ? { platform: "Facebook", url: row.facebook_url } : null,
              row.other_social_url ? { platform: "Other", url: row.other_social_url } : null,
            ].filter((link): link is { platform: string; url: string } => link !== null);
            return socials.length ? { socials } : {};
          })(),
          ...(row.email ? { email: row.email } : {}),
          ...(row.website ? { website: row.website } : {}),
          ...(row.location ? { location: row.location } : {}),
          ...(row.notes ? { blurb: row.notes } : {}),
        })),
        { listId, audience, temperature, briefId, source: "upload" },
      );

      toast.success(
        `Imported ${toSave.length} ${toSave.length === 1 ? "person" : "people"}${
          skipDuplicates && duplicates.length ? ` · skipped ${duplicates.length} already on your lists` : ""
        }.`,
      );
      onImported(listId, toSave.length);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setSaving(false);
    }
  };

  const missingLinkedIn = rows.filter((row) => !row.linkedin_url).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Upload your own list</DialogTitle>
          <DialogDescription>
            Drop in a CSV or paste rows from a spreadsheet. Anything missing — LinkedIn URLs,
            titles, blurbs — you can fill in afterwards with a batch lookup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv,text/plain,text/tab-separated-values"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                load(await file.text());
                if (destination === "new") setNewListName(file.name.replace(/\.[^.]+$/, ""));
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="h-10 rounded-full bg-primary px-5 font-medium text-primary-foreground"
            >
              Choose a CSV
            </button>
            <span className="text-muted-foreground">or paste below</span>
          </div>

          <textarea
            value={raw}
            onChange={(event) => load(event.target.value)}
            rows={5}
            placeholder={"Name, Title, Company, LinkedIn URL, Instagram, Email\nJane Doe, Founder, Acme, https://linkedin.com/in/janedoe, jane@acme.com"}
            className="w-full rounded-xl border border-input bg-background p-3 text-foreground"
          />

          {table.length > 0 ? (
            <>
              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(event) => setHasHeader(event.target.checked)}
                  className="h-5 w-5 accent-[color:var(--primary)]"
                />
                First row is a header row
              </label>

              <div>
                <h3 className="font-display text-xl text-foreground">Match your columns</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {headers.map((header, index) => (
                    <div key={`${header}-${index}`} className="flex items-center gap-2">
                      <span className="w-1/2 truncate text-muted-foreground" title={header}>
                        {header || `Column ${index + 1}`}
                      </span>
                      <select
                        value={mapping[index] ?? "ignore"}
                        onChange={(event) =>
                          setMapping((prev) => {
                            const next = [...prev];
                            next[index] = event.target.value as ImportField;
                            return next;
                          })
                        }
                        aria-label={`Map column ${header || index + 1}`}
                        className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-foreground"
                      >
                        {IMPORT_FIELDS.map((field) => (
                          <option key={field.field} value={field.field}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-foreground">
                  {rows.length} {rows.length === 1 ? "person" : "people"} ready to import
                  {missingLinkedIn > 0 ? ` · ${missingLinkedIn} without a LinkedIn URL` : ""}
                </p>
                {rows.slice(0, 3).map((row, index) => (
                  <p key={index} className="mt-1 text-muted-foreground">
                    {[row.name, row.title, row.company, row.linkedin_url].filter(Boolean).join(" · ")}
                  </p>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-muted-foreground">Put them in</span>
                  <select
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-foreground"
                  >
                    <option value="new">A new list</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </label>
                {destination === "new" ? (
                  <label className="block">
                    <span className="text-muted-foreground">List name</span>
                    <input
                      value={newListName}
                      onChange={(event) => setNewListName(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-foreground"
                    />
                  </label>
                ) : null}
                <label className="block">
                  <span className="text-muted-foreground">Audience</span>
                  <select
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-foreground"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-muted-foreground">Temperature</span>
                  <select
                    value={temperature}
                    onChange={(event) => setTemperature(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-foreground"
                  >
                    {["Hot", "Warm", "Cold"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(event) => setSkipDuplicates(event.target.checked)}
                  className="h-5 w-5 accent-[color:var(--primary)]"
                />
                Skip anyone already on my lists
              </label>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving || rows.length === 0}
                className="h-11 w-full rounded-full bg-primary font-medium text-primary-foreground disabled:opacity-40"
              >
                {saving ? "Importing…" : `Import ${rows.length} ${rows.length === 1 ? "person" : "people"}`}
              </button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
