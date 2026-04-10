import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { invalidateOrgCache } from "@/lib/admin-cache";

/**
 * Internal cache-bust endpoint. Calls invalidateOrgCache for the given org slug,
 * clearing every unstable_cache tag that holds option/swatch/floorplan data.
 *
 * Usage:
 *   curl -X POST https://withfin.ch/api/internal/bust-cache/demo \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Auth: CRON_SECRET bearer token (same as other cron endpoints).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();
  if (error || !org) {
    return NextResponse.json({ error: `Org not found: ${orgSlug}` }, { status: 404 });
  }

  invalidateOrgCache(org.id, { orgSlug: org.slug });

  return NextResponse.json({
    ok: true,
    orgSlug: org.slug,
    orgId: org.id,
    tagsInvalidated: [
      `floorplans:${org.id}`,
      `categories:${org.id}`,
      `org:${org.slug}`,
      `admin:categories:${org.id}`,
      `admin:floorplans:${org.id}`,
      `admin:steps-all:${org.id}`,
    ],
  });
}
