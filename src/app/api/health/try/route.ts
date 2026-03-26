import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { DEMO_ORG_ID } from "@/lib/demo-generate";

/**
 * Health check for the /try demo flow.
 * Verifies: demo org exists in DB, storage buckets are accessible.
 * Returns 200 if healthy, 503 with details if not.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const supabase = getServiceClient();

  // 1. Verify demo org exists and matches hardcoded UUID
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("id", DEMO_ORG_ID)
    .single();

  if (orgError || !org) {
    checks.demo_org = { ok: false, detail: "Demo org not found in DB" };
  } else if (org.slug !== "demo") {
    checks.demo_org = { ok: false, detail: `Expected slug "demo", got "${org.slug}"` };
  } else {
    checks.demo_org = { ok: true };
  }

  // 2. Verify demo-uploads bucket is accessible (list with limit 1)
  const { error: uploadsError } = await supabase.storage
    .from("demo-uploads")
    .list("", { limit: 1 });

  checks.storage_uploads = uploadsError
    ? { ok: false, detail: uploadsError.message }
    : { ok: true };

  // 3. Verify demo-generated bucket is accessible
  const { error: generatedError } = await supabase.storage
    .from("demo-generated")
    .list("", { limit: 1 });

  checks.storage_generated = generatedError
    ? { ok: false, detail: generatedError.message }
    : { ok: true };

  const healthy = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { healthy, checks },
    { status: healthy ? 200 : 503 },
  );
}
