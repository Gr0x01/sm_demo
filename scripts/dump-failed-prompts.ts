/**
 * Pull failed Inngest runs and reconstruct the exact prompts BFL saw,
 * so we can share them with BFL support for their moderation investigation.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { buildEditPrompt } from "../src/lib/generate";
import type { Option, SubCategory } from "../src/types";

const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";

const FAILED_RUN_IDS = [
  "01KNP2TGY21CG6E7Y9TT2C205D",
  "01KNP26Q2DKNDGDYQ71CZV1Q5V",
  "01KNP24G71TB2C43M1BQFQC1PB",
  "01KNNGVSTBYK3VBW2X3SD68Y81",
  "01KNNE7ZE6GWRSV59JBVTM289R",
  "01KNN38MMCP5NXWWSF7DKV494D",
  "01KNN2WWME3QTMMJJWYSGT0YDF",
  "01KNN0D2Z9JBS3GJ0VT4N9D7H0",
  "01KNMWJEHAQBX5JJ1CA9M1WTW2",
  "01KNMW9K9B4FTVM7WCVGKGTQP5",
];

async function fetchTrigger(runId: string) {
  const res = await fetch("http://localhost:8288/v0/gql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ runTrigger(runID: "${runId}") { eventName payloads } }`,
    }),
  });
  const json = await res.json();
  const t = json.data.runTrigger;
  return { eventName: t.eventName, payload: JSON.parse(t.payloads[0]) };
}

async function buildOptionLookupForOrg(supabase: ReturnType<typeof createClient>, orgId: string) {
  const { data: cats } = await supabase
    .from("categories")
    .select(`id, slug, name, sort_order,
      subcategories (id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
        options (id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default, scoped_edit_model, linked_to_subcategory))`)
    .eq("org_id", orgId)
    .order("sort_order");

  const lookup = new Map<string, { option: Option; subCategory: SubCategory }>();
  for (const cat of (cats || []) as any[]) {
    for (const sub of (cat.subcategories ?? []) as any[]) {
      const subCategory: SubCategory = {
        id: sub.slug, name: sub.name, categoryId: cat.slug,
        isVisual: sub.is_visual,
        generationHint: sub.generation_hint ?? undefined,
        generationRules: sub.generation_rules ?? undefined,
        generationRulesWhenNotSelected: sub.generation_rules_when_not_selected ?? undefined,
        isAppliance: sub.is_appliance || undefined,
        options: [],
      };
      for (const opt of (sub.options ?? []) as any[]) {
        const option: Option = {
          id: opt.slug, name: opt.name, price: opt.price,
          promptDescriptor: opt.prompt_descriptor ?? undefined,
          dimensions: opt.dimensions ?? undefined,
          swatchUrl: opt.swatch_url ?? undefined,
          swatchColor: opt.swatch_color ?? undefined,
          generationRules: opt.generation_rules ?? undefined,
          isDefault: opt.is_default || undefined,
          scopedEditModel: opt.scoped_edit_model ?? undefined,
          linkedToSubcategory: opt.linked_to_subcategory ?? undefined,
        };
        lookup.set(`${sub.slug}:${opt.slug}`, { option, subCategory });
      }
    }
  }
  return lookup;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Demo org is the only org that hosts both /try and /for/ demos
  const optionLookup = await buildOptionLookupForOrg(supabase, DEMO_ORG_ID);

  // Dummy resolver — for prompt reconstruction we don't need actual swatch bytes,
  // just need buildEditPrompt to take the swatch-present branch. Return a 1-byte buffer.
  const dummyResolver = async () => ({ buffer: Buffer.from([0]), mediaType: "image/jpeg" });

  const results: Array<{ runId: string; eventName: string; selections: Record<string, string>; spatialHints: Record<string, string>; prompt: string; swatchCount: number; contextNote: string }> = [];

  for (const runId of FAILED_RUN_IDS) {
    try {
      const { eventName, payload } = await fetchTrigger(runId);
      let selections: Record<string, string>;
      let spatialHints: Record<string, string>;
      let contextNote = "";

      if (eventName === "demo/generate.requested") {
        // /try demo — selections and hints come from sceneAnalysis
        selections = payload.data.effectiveSelections;
        spatialHints = payload.data.sceneAnalysis?.spatialHints ?? {};
        contextNote = "/try demo (sample kitchen)";
      } else if (eventName === "photo/generate.requested") {
        // Buyer/prospect — spatialHints come directly on the event
        selections = payload.data.scopedSelections;
        spatialHints = payload.data.spatialHints ?? {};
        contextNote = `${payload.data.orgSlug}/${payload.data.floorplanSlug} — ${payload.data.source ?? ""}`;
      } else {
        console.log(`Skipping ${runId}: unknown event ${eventName}`);
        continue;
      }

      const { prompt, swatches } = await buildEditPrompt(
        selections, optionLookup, spatialHints, dummyResolver,
      );

      results.push({ runId, eventName, selections, spatialHints, prompt, swatchCount: swatches.length, contextNote });
    } catch (err) {
      console.error(`Failed to reconstruct ${runId}:`, err);
    }
  }

  // Print human-readable report
  console.log("=".repeat(80));
  console.log(`FAILED PROMPT DUMP — ${results.length} runs`);
  console.log("All runs returned BFL 'Request Moderated' on flux-2-max with safety_tolerance=5");
  console.log("=".repeat(80));

  for (const r of results) {
    console.log(`\n── Run ${r.runId} ──`);
    console.log(`Context: ${r.contextNote}`);
    console.log(`Swatch reference images sent: ${r.swatchCount}`);
    console.log(`Selections: ${JSON.stringify(r.selections)}`);
    console.log(`\nPROMPT:`);
    console.log(r.prompt);
    console.log();
  }

  // Also write a clean JSON dump for BFL
  const fs = await import("fs");
  const outPath = "temp/bfl-moderation-failures.json";
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Wrote JSON dump to ${outPath}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
