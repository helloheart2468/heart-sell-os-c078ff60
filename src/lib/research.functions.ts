import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { researchProspect, type ProspectResearchResult } from "@/lib/perplexity.server";

export type BulkResearchEntry = {
  prospect_id: string;
  name: string;
  result?: ProspectResearchResult;
  error?: string;
};

const MAX_BATCH = 10;
const CONCURRENCY = 3;

export const researchProspectsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ prospectIds: z.array(z.string().uuid()).min(1).max(MAX_BATCH) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ entries: BulkResearchEntry[] }> => {
    const supabase = context.supabase;

    const { data: rows, error } = await supabase
      .from("prospects")
      .select("id, name, title, company, location, linkedin_url, social_url, website")
      .in("id", data.prospectIds);
    if (error) throw new Error(error.message);

    const { data: business } = await supabase
      .from("business_profile")
      .select("business_summary, unfair_advantage")
      .maybeSingle();
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_brief_id")
      .maybeSingle();
    const briefId = profile?.current_brief_id ?? null;
    const { data: brief } = briefId
      ? await supabase
          .from("audience_briefs")
          .select("icp_description")
          .eq("id", briefId)
          .maybeSingle()
      : { data: null };

    const founderContext = [
      business?.business_summary ?? "",
      business?.unfair_advantage ?? "",
      brief?.icp_description ?? "",
    ]
      .filter(Boolean)
      .join(" | ");

    const queue = (rows ?? []).slice(0, MAX_BATCH);
    const entries: BulkResearchEntry[] = [];

    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const row = queue[cursor++];
        if (!row) return;
        const entry: BulkResearchEntry = { prospect_id: row.id, name: row.name };
        try {
          entry.result = await researchProspect({
            name: row.name,
            ...(row.title ? { title: row.title } : {}),
            ...(row.company ? { company: row.company } : {}),
            ...(row.location ? { location: row.location } : {}),
            ...(row.linkedin_url || row.social_url || row.website
              ? { link: (row.linkedin_url || row.social_url || row.website) as string }
              : {}),
            ...(founderContext ? { founderContext } : {}),
          });
        } catch (err) {
          entry.error = err instanceof Error ? err.message : "Research failed.";
        }
        entries.push(entry);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    const order = new Map(queue.map((row, index) => [row.id, index]));
    entries.sort((a, b) => (order.get(a.prospect_id) ?? 0) - (order.get(b.prospect_id) ?? 0));

    return { entries };
  });
