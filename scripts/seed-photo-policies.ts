/**
 * Seed internal per-photo generation policies.
 *
 * Usage:
 *   npx tsx scripts/seed-photo-policies.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seedStoneMartinKitchenPolicy() {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "stonemartin")
    .single();
  if (orgErr || !org) throw new Error(`Failed to load stonemartin org: ${orgErr?.message ?? "not found"}`);

  const { data: floorplan, error: fpErr } = await supabase
    .from("floorplans")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", "kinkade")
    .single();
  if (fpErr || !floorplan) throw new Error(`Failed to load kinkade floorplan: ${fpErr?.message ?? "not found"}`);

  const { data: step, error: stepErr } = await supabase
    .from("steps")
    .select("id")
    .eq("org_id", org.id)
    .eq("floorplan_id", floorplan.id)
    .eq("slug", "design-your-kitchen")
    .single();
  if (stepErr || !step) throw new Error(`Failed to load design-your-kitchen step: ${stepErr?.message ?? "not found"}`);

  const { data: photo, error: photoErr } = await supabase
    .from("step_photos")
    .select("id, image_path")
    .eq("org_id", org.id)
    .eq("step_id", step.id)
    .ilike("image_path", "%kitchen-close.webp")
    .limit(1)
    .maybeSingle();
  if (photoErr || !photo) throw new Error(`Failed to load kitchen-close photo: ${photoErr?.message ?? "not found"}`);

  const policy = {
    promptOverrides: {
      invariantRulesWhenSelected: {
        refrigerator: [
          "Refrigerator opening is reserved for the refrigerator only. Place the selected refrigerator in that opening and do NOT fill that opening with cabinets, drawers, shelves, pantry units, or countertops.",
        ],
      },
      invariantRulesWhenNotSelected: {
        refrigerator: [
          "Refrigerator opening state must match the source photo exactly: if the opening/alcove is empty, keep it empty; if it contains a refrigerator, keep that refrigerator unchanged.",
          "Never convert the refrigerator opening into cabinetry, drawers, shelves, pantry units, countertops, or trim build-outs. The only permitted change inside an empty opening is wall paint/finish.",
        ],
      },
    },
    secondPass: {
      reason: "stonemartin_kitchen_slide_in_range",
      inputFidelity: "low",
      whenSelected: {
        subId: "range",
        optionIds: ["range-ge-gas-slide-in", "range-ge-gas-slide-in-convection"],
      },
      prompt:
        "Second pass: correct ONLY the cooking range geometry on the back wall. " +
        "The selected range is slide-in: NO raised backguard panel, backsplash tile must be visible directly behind the cooktop, " +
        "and there must be exactly one oven door below the cooktop. Keep all surrounding cabinetry, countertop seams, island, sink, faucet, floor, walls, and lighting unchanged.",
    },
  };

  const { error: upsertErr } = await supabase
    .from("step_photo_generation_policies")
    .upsert(
      {
        org_id: org.id,
        step_photo_id: photo.id,
        policy_key: "stonemartin:kinkade:kitchen-close:v1",
        is_active: true,
        policy_json: policy,
      },
      { onConflict: "org_id,step_photo_id,policy_key" },
    );
  if (upsertErr) throw new Error(`Failed to upsert policy: ${upsertErr.message}`);

  console.log(`Policy upserted for step_photo ${photo.id} (${photo.image_path})`);
}

async function seedStoneMartinGreatroomPolicy() {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "stonemartin")
    .single();
  if (orgErr || !org) throw new Error(`Failed to load stonemartin org: ${orgErr?.message ?? "not found"}`);

  const { data: floorplan, error: fpErr } = await supabase
    .from("floorplans")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", "kinkade")
    .single();
  if (fpErr || !floorplan) throw new Error(`Failed to load kinkade floorplan: ${fpErr?.message ?? "not found"}`);

  const { data: step, error: stepErr } = await supabase
    .from("steps")
    .select("id")
    .eq("org_id", org.id)
    .eq("floorplan_id", floorplan.id)
    .eq("slug", "set-your-style")
    .single();
  if (stepErr || !step) throw new Error(`Failed to load set-your-style step: ${stepErr?.message ?? "not found"}`);

  const { data: photo, error: photoErr } = await supabase
    .from("step_photos")
    .select("id, image_path")
    .eq("org_id", org.id)
    .eq("step_id", step.id)
    .ilike("image_path", "%greatroom-wide.webp")
    .limit(1)
    .maybeSingle();
  if (photoErr || !photo) throw new Error(`Failed to load greatroom-wide photo: ${photoErr?.message ?? "not found"}`);

  const policy = {
    promptOverrides: {
      invariantRulesAlways: [
        "The fireplace is mostly out of frame in this wide shot — only a small sliver of hearth brick is visible at the extreme bottom-left corner. Do NOT draw, reposition, or enlarge the fireplace. Only change the material/color of the small brick area already visible at the bottom-left edge.",
        "Preserve room zoning exactly as the source photo: the main great-room/living floor area (especially the left/foreground open space) must stay open and uncluttered.",
        "Do NOT add any new kitchen structures in the great-room area: no new islands, perimeter cabinets, countertops, appliances, sinks, faucets, or backsplash walls.",
        "Kitchen edits are allowed ONLY on existing kitchen elements already visible in the source background kitchen zone. Do NOT expand the kitchen footprint into the living room.",
      ],
    },
  };

  const { error: upsertErr } = await supabase
    .from("step_photo_generation_policies")
    .upsert(
      {
        org_id: org.id,
        step_photo_id: photo.id,
        policy_key: "stonemartin:kinkade:greatroom-wide:v1",
        is_active: true,
        policy_json: policy,
      },
      { onConflict: "org_id,step_photo_id,policy_key" },
    );
  if (upsertErr) throw new Error(`Failed to upsert policy: ${upsertErr.message}`);

  console.log(`Policy upserted for step_photo ${photo.id} (${photo.image_path})`);
}

async function main() {
  try {
    await seedStoneMartinKitchenPolicy();
    await seedStoneMartinGreatroomPolicy();
    console.log("Done.");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
