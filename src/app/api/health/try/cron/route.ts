import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServiceClient } from "@/lib/supabase";
import { DEMO_ORG_ID } from "@/lib/demo-generate";

/**
 * Vercel Cron-triggered health check for the /try demo flow.
 * Runs the same checks as GET /api/health/try but sends an alert
 * email via Resend if anything is unhealthy.
 */
export async function GET(request: Request) {
  // Vercel Crons send this header — reject manual hits in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const supabase = getServiceClient();

  // 1. Demo org exists
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

  // 2. Storage buckets
  const { error: uploadsError } = await supabase.storage
    .from("demo-uploads")
    .list("", { limit: 1 });
  checks.storage_uploads = uploadsError
    ? { ok: false, detail: uploadsError.message }
    : { ok: true };

  const { error: generatedError } = await supabase.storage
    .from("demo-generated")
    .list("", { limit: 1 });
  checks.storage_generated = generatedError
    ? { ok: false, detail: generatedError.message }
    : { ok: true };

  const healthy = Object.values(checks).every((c) => c.ok);

  if (!healthy) {
    // Send alert email
    const from = process.env.RESEND_FROM_EMAIL;
    const apiKey = process.env.RESEND_API_KEY;
    if (from && apiKey) {
      const failed = Object.entries(checks)
        .filter(([, c]) => !c.ok)
        .map(([name, c]) => `• ${name}: ${c.detail}`)
        .join("\n");

      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: "hello@withfin.ch",
        subject: "[Finch] /try health check failed",
        text: `The /try demo health check failed at ${new Date().toISOString()}.\n\nFailing checks:\n${failed}\n\nAll checks:\n${JSON.stringify(checks, null, 2)}`,
      }).catch((err) => {
        console.error("[health/cron] Failed to send alert email:", err);
      });
    }
  }

  return NextResponse.json({ healthy, checks }, { status: healthy ? 200 : 503 });
}
