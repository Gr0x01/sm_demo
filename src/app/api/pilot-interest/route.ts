import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServiceClient } from "@/lib/supabase";
import { inngest } from "@/inngest/client";
import { captureEvent } from "@/lib/posthog-server";

const pilotSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = pilotSchema.safeParse(body);
    if (!parsed.success) {
      await captureEvent("anonymous", "pilot_lead_failed", {
        error: parsed.error.message,
        stage: "validation",
        raw_company: typeof body?.company === "string" ? body.company : null,
      }).catch(() => {});
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { name, company, email, phone } = parsed.data;

    // Persist lead first — everything else can retry
    const supabase = getServiceClient();
    const { error: dbError } = await supabase
      .from("pilot_leads")
      .upsert(
        { name, company, email, phone, source: "pilot_form" },
        { onConflict: "email,source" }
      );

    if (dbError) {
      console.error("[pilot-interest] DB insert failed:", dbError);
      await captureEvent(email, "pilot_lead_failed", {
        name, company, email, phone: phone || null,
        error: dbError.message,
        stage: "db_insert",
      }).catch(() => {});
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Dispatch to Inngest — handles email (with retries) + PostHog tracking
    await inngest.send({
      name: "pilot/lead.received",
      data: { name, company, email, phone: phone || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pilot-interest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
