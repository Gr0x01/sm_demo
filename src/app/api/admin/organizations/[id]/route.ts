import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";

const SUPABASE_STORAGE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color");

const patchSchema = z.object({
  org_id: z.string(),
  logo_url: z
    .string()
    .refine(
      (url) => {
        try {
          return new URL(url).host === SUPABASE_STORAGE_HOST;
        } catch {
          return false;
        }
      },
      { message: "Logo URL must point to project storage" }
    )
    .nullable()
    .optional(),
  logo_type: z.enum(["icon", "wordmark"]).optional(),
  primary_color: hexColor.optional(),
  secondary_color: hexColor.optional(),
  accent_color: hexColor.optional(),
  header_style: z.enum(["light", "dark"]).optional(),
  corner_style: z.enum(["sharp", "rounded"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    // Verify the URL param matches the authenticated org
    if (id !== auth.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { supabase, orgId, orgSlug } = auth;

    if (!orgSlug) {
      return NextResponse.json({ error: "Could not resolve org" }, { status: 500 });
    }

    // Build update object from provided fields (exclude org_id)
    const { org_id: _, ...fields } = parsed.data;
    const updateFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updateFields[key] = value;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("organizations")
      .update(updateFields)
      .eq("id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId, { orgSlug });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
