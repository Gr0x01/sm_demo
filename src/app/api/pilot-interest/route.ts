import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServiceClient } from "@/lib/supabase";
import { sendPilotInterestEmail } from "@/lib/email";

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
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { name, company, email, phone } = parsed.data;

    // Persist lead first — email failure must not lose the lead
    // Upsert on (email, source) so double-submits succeed silently
    const supabase = getServiceClient();
    const { error: dbError } = await supabase
      .from("pilot_leads")
      .upsert(
        { name, company, email, phone, source: "pilot_form" },
        { onConflict: "email,source" }
      );

    if (dbError) {
      console.error("[pilot-interest] DB insert failed:", dbError);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // Email notification is best-effort — lead is already saved
    try {
      await sendPilotInterestEmail(parsed.data);
    } catch (emailError) {
      console.error("[pilot-interest] Email notification failed:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pilot-interest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
