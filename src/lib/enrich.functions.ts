import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enrichPerson, type EnrichedPerson } from "@/lib/enrich.server";

export type EnrichEntry = {
  prospect_id: string;
  name: string;
  result?: EnrichedPerson;
  applied?: string[];
  error?: string;
};

const MAX_BATCH = 10;
const CONCURRENCY = 3;

export const enrichProspectsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ prospectIds: z.array(z.string().uuid()).min(1).max(MAX_BATCH) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ entries: EnrichEntry[] }> => {
    const supabase = context.supabase;

    const { data: rows, error } = await supabase
      .from("prospects")
      .select("id, name, title, company, location, linkedin_url, website, email, blurb, notes")
      .in("id", data.prospectIds);
    if (error) throw new Error(error.message);

    const queue = (rows ?? []).slice(0, MAX_BATCH);
    const entries: EnrichEntry[] = [];

    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const row = queue[cursor++];
        if (!row) return;
        const entry: EnrichEntry = { prospect_id: row.id, name: row.name };
        try {
          const found = await enrichPerson({
            name: row.name,
            ...(row.title ? { title: row.title } : {}),
            ...(row.company ? { company: row.company } : {}),
            ...(row.location ? { location: row.location } : {}),
            ...(row.notes ? { hint: row.notes.slice(0, 300) } : {}),
          });
          entry.result = found;

          // Only fill gaps — never overwrite what the founder already supplied.
          const patch: Record<string, string> = {};
          const fill = (key: "linkedin_url" | "website" | "email" | "title" | "company" | "location" | "blurb") => {
            const current = (row as Record<string, unknown>)[key];
            const next = found[key];
            if (!current && next) patch[key] = next;
          };
          (["linkedin_url", "website", "email", "title", "company", "location", "blurb"] as const).forEach(fill);

          entry.applied = Object.keys(patch);
          await supabase
            .from("prospects")
            .update({
              ...patch,
              sources: found.citations.slice(0, 8),
              enrichment_state: found.linkedin_url || Object.keys(patch).length ? "enriched" : "not_found",
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        } catch (err) {
          entry.error = err instanceof Error ? err.message : "Lookup failed.";
        }
        entries.push(entry);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    const order = new Map(queue.map((row, index) => [row.id, index]));
    entries.sort((a, b) => (order.get(a.prospect_id) ?? 0) - (order.get(b.prospect_id) ?? 0));
    return { entries };
  });
