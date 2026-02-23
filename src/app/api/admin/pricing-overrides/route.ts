import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";

// GET: fetch all overrides for a floorplan as { [optionId]: price }
export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("org_id");
    const floorplanId = request.nextUrl.searchParams.get("floorplan_id");

    const auth = await authenticateAdminRequest({ org_id: orgId ?? undefined });
    if ("error" in auth) return auth.error;

    if (!floorplanId) {
      return NextResponse.json({ error: "Missing floorplan_id" }, { status: 400 });
    }

    // Validate floorplan belongs to org
    const { data: fp } = await auth.supabase
      .from("floorplans")
      .select("id")
      .eq("id", floorplanId)
      .eq("org_id", auth.orgId)
      .single();

    if (!fp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await auth.supabase
      .from("option_floorplan_pricing")
      .select("option_id, price")
      .eq("floorplan_id", floorplanId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const overrides: Record<string, number> = {};
    for (const row of data ?? []) {
      overrides[row.option_id as string] = row.price as number;
    }

    return NextResponse.json(overrides);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const upsertSchema = z.object({
  org_id: z.string(),
  floorplan_id: z.string(),
  option_id: z.string(),
  price: z.number().int().nonnegative(),
});

// PUT: upsert a single override
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { floorplan_id, option_id, price } = parsed.data;

    // Validate floorplan and option both belong to org
    const [{ data: fp }, { data: opt }] = await Promise.all([
      auth.supabase
        .from("floorplans")
        .select("id")
        .eq("id", floorplan_id)
        .eq("org_id", auth.orgId)
        .single(),
      auth.supabase
        .from("options")
        .select("id")
        .eq("id", option_id)
        .eq("org_id", auth.orgId)
        .single(),
    ]);

    if (!fp) {
      return NextResponse.json({ error: "Floorplan not found" }, { status: 404 });
    }
    if (!opt) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    const { error } = await auth.supabase
      .from("option_floorplan_pricing")
      .upsert(
        { option_id, floorplan_id, price },
        { onConflict: "option_id,floorplan_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidateOrgCache(auth.orgId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  org_id: z.string(),
  floorplan_id: z.string(),
  option_id: z.string(),
});

// DELETE: remove override (revert to base price)
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { floorplan_id, option_id } = parsed.data;

    // Validate floorplan and option both belong to org
    const [{ data: fp }, { data: opt }] = await Promise.all([
      auth.supabase
        .from("floorplans")
        .select("id")
        .eq("id", floorplan_id)
        .eq("org_id", auth.orgId)
        .single(),
      auth.supabase
        .from("options")
        .select("id")
        .eq("id", option_id)
        .eq("org_id", auth.orgId)
        .single(),
    ]);

    if (!fp) {
      return NextResponse.json({ error: "Floorplan not found" }, { status: 404 });
    }
    if (!opt) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    const { error } = await auth.supabase
      .from("option_floorplan_pricing")
      .delete()
      .eq("option_id", option_id)
      .eq("floorplan_id", floorplan_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidateOrgCache(auth.orgId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
