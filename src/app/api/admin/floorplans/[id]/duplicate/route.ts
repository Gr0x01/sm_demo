import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { slugify } from "@/lib/slugify";
import { getServiceClient } from "@/lib/supabase";

const duplicateSchema = z.object({ org_id: z.string() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = duplicateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;

    // 1. Fetch source floorplan
    const { data: source, error: srcErr } = await supabase
      .from("floorplans")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (srcErr || !source) {
      return NextResponse.json({ error: "Floorplan not found" }, { status: 404 });
    }

    // 2. Generate slug + insert new floorplan
    const newName = `${source.name} (Copy)`;
    const baseSlug = slugify(newName);
    const { data: uniqueSlug } = await supabase.rpc("generate_unique_slug", {
      p_table: "floorplans",
      p_base_slug: baseSlug,
      p_scope_column: "org_id",
      p_scope_value: orgId,
    });

    const { data: newFp, error: fpErr } = await supabase
      .from("floorplans")
      .insert({
        slug: uniqueSlug ?? baseSlug,
        org_id: orgId,
        name: newName,
        community: source.community,
        price_sheet_label: source.price_sheet_label,
        is_active: false,
      })
      .select()
      .single();

    if (fpErr || !newFp) {
      return NextResponse.json({ error: fpErr?.message ?? "Failed to create floorplan" }, { status: 500 });
    }

    // 3. Fetch source steps
    const { data: sourceSteps } = await supabase
      .from("steps")
      .select("*")
      .eq("floorplan_id", id)
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true });

    const serviceClient = getServiceClient();
    const stepIdMap = new Map<string, string>(); // old step ID -> new step ID

    // 4. Clone each step + its photos
    for (const step of sourceSteps ?? []) {
      try {
        const stepBaseSlug = slugify(step.name);
        const { data: stepSlug } = await supabase.rpc("generate_unique_slug", {
          p_table: "steps",
          p_base_slug: stepBaseSlug,
          p_scope_column: "floorplan_id",
          p_scope_value: newFp.id,
        });

        const { data: newStep, error: stepErr } = await supabase
          .from("steps")
          .insert({
            slug: stepSlug ?? stepBaseSlug,
            org_id: orgId,
            floorplan_id: newFp.id,
            name: step.name,
            subtitle: step.subtitle,
            number: step.number,
            sort_order: step.sort_order,
            show_generate_button: step.show_generate_button,
            scene_description: step.scene_description,
            also_include_ids: step.also_include_ids,
            photo_baseline: step.photo_baseline,
            spatial_hints: step.spatial_hints,
            sections: step.sections,
            hero_variant: step.hero_variant,
          })
          .select()
          .single();

        if (stepErr || !newStep) {
          console.error(`[floorplan-duplicate] Failed to clone step "${step.name}":`, stepErr);
          continue;
        }

        stepIdMap.set(step.id, newStep.id);

        // Clone step photos (parallel within each step)
        const { data: photos } = await supabase
          .from("step_photos")
          .select("*")
          .eq("step_id", step.id)
          .eq("org_id", orgId)
          .order("sort_order", { ascending: true });

        await Promise.all(
          (photos ?? []).map(async (photo) => {
            try {
              // Download source file
              const { data: fileData, error: dlErr } = await serviceClient.storage
                .from("rooms")
                .download(photo.image_path);

              if (dlErr || !fileData) {
                console.error(`[floorplan-duplicate] Failed to download photo:`, dlErr);
                return;
              }

              // Upload to new path (prefix with photo ID to avoid collisions)
              const originalName = photo.image_path.split("/").pop() ?? "photo.jpg";
              const filename = `${photo.id}_${originalName}`;
              const newPath = `${orgId}/rooms/${newStep.id}/${filename}`;

              const { error: upErr } = await serviceClient.storage
                .from("rooms")
                .upload(newPath, fileData, {
                  contentType: fileData.type || "image/jpeg",
                  upsert: false,
                });

              if (upErr) {
                console.error(`[floorplan-duplicate] Failed to upload photo:`, upErr);
                return;
              }

              // Insert step_photos row
              const { error: insertErr } = await supabase.from("step_photos").insert({
                org_id: orgId,
                step_id: newStep.id,
                image_path: newPath,
                label: photo.label,
                is_hero: photo.is_hero,
                sort_order: photo.sort_order,
                spatial_hint: photo.spatial_hint,
                photo_baseline: photo.photo_baseline,
                check_result: photo.check_result,
                check_feedback: photo.check_feedback,
              });
              if (insertErr) {
                console.error(`[floorplan-duplicate] Failed to insert photo row:`, insertErr);
              }
            } catch (photoErr) {
              console.error(`[floorplan-duplicate] Photo clone error:`, photoErr);
            }
          })
        );
      } catch (stepCloneErr) {
        console.error(`[floorplan-duplicate] Step clone error:`, stepCloneErr);
      }
    }

    // 5. Remap also_include_ids to point to new step IDs
    for (const [oldId, newId] of stepIdMap) {
      const sourceStep = (sourceSteps ?? []).find((s) => s.id === oldId);
      if (!sourceStep?.also_include_ids?.length) continue;

      const remapped = sourceStep.also_include_ids
        .map((refId: string) => stepIdMap.get(refId))
        .filter(Boolean);

      const { error: updateErr } = await supabase
        .from("steps")
        .update({ also_include_ids: remapped })
        .eq("id", newId);

      if (updateErr) {
        console.error(`[floorplan-duplicate] Failed to remap also_include_ids for step ${newId}:`, updateErr);
      }
    }

    invalidateOrgCache(orgId, { floorplanId: newFp.id, floorplanSlug: newFp.slug });
    return NextResponse.json(newFp, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
