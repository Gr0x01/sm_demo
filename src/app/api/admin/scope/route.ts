import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";

const scopeSchema = z.object({
  org_id: z.string(),
  level: z.enum(["category", "subcategory", "option"]),
  entity_id: z.string(),
  floorplan_ids: z.array(z.string()), // empty = all floorplans
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = scopeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;
    const { level, entity_id, floorplan_ids } = parsed.data;

    // Validate floorplan_ids belong to this org
    if (floorplan_ids.length > 0) {
      const { data: owned } = await supabase
        .from("floorplans")
        .select("id")
        .in("id", floorplan_ids)
        .eq("org_id", orgId);
      const ownedSet = new Set((owned ?? []).map((f) => f.id));
      const invalid = floorplan_ids.filter((id) => !ownedSet.has(id));
      if (invalid.length > 0) {
        return NextResponse.json({ error: "Invalid floorplan IDs" }, { status: 400 });
      }
    }

    if (level === "category") {
      // Verify category belongs to this org
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("id", entity_id)
        .eq("org_id", orgId)
        .single();
      if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // Category uses junction table
      const { error: deleteError } = await supabase
        .from("category_floorplan_scope")
        .delete()
        .eq("category_id", entity_id);

      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

      if (floorplan_ids.length > 0) {
        const rows = floorplan_ids.map((fpId) => ({
          category_id: entity_id,
          floorplan_id: fpId,
        }));

        const { error: insertError } = await supabase
          .from("category_floorplan_scope")
          .insert(rows);

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    } else {
      // Subcategory and option use floorplan_ids column
      const table = level === "subcategory" ? "subcategories" : "options";
      const { error } = await supabase
        .from(table)
        .update({ floorplan_ids })
        .eq("id", entity_id)
        .eq("org_id", orgId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidateOrgCache(orgId);
    return NextResponse.json({ success: true, scoped_to: floorplan_ids.length || "all" });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET: fetch scopes for a list of entities
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") as "category" | "subcategory" | "option";
    const entityIds = searchParams.get("entity_ids")?.split(",") ?? [];

    if (!level || !entityIds.length) {
      return NextResponse.json({ error: "Missing level or entity_ids" }, { status: 400 });
    }

    const auth = await authenticateAdminRequest({ org_id: searchParams.get("org_id") ?? "" });
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;

    if (level === "category") {
      // Verify categories belong to this org
      const { data: ownedCats } = await supabase
        .from("categories")
        .select("id")
        .in("id", entityIds)
        .eq("org_id", orgId);
      const ownedIds = (ownedCats ?? []).map((c) => c.id);

      // Category uses junction table
      const { data, error } = await supabase
        .from("category_floorplan_scope")
        .select("*")
        .in("category_id", ownedIds);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ scopes: data });
    } else {
      // Subcategory/option: read floorplan_ids column
      const table = level === "subcategory" ? "subcategories" : "options";
      const { data, error } = await supabase
        .from(table)
        .select("id, floorplan_ids")
        .in("id", entityIds)
        .eq("org_id", orgId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Transform to same shape the popover expects: { floorplan_id: "..." } per entry
      const scopes = (data ?? []).flatMap((row) =>
        (row.floorplan_ids as string[]).map((fpId) => ({ floorplan_id: fpId }))
      );
      return NextResponse.json({ scopes });
    }
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
