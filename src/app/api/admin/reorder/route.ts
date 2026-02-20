import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";

const reorderSchema = z.object({
  org_id: z.string(),
  table: z.enum(["categories", "subcategories", "options", "steps"]),
  items: z.array(z.object({
    id: z.string(),
    sort_order: z.number().int(),
  })),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;
    const { table, items } = parsed.data;

    const { error } = await supabase.rpc("reorder_items", {
      p_table: table,
      p_items: items,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
