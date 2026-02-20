import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase";
import { validateEmail } from "@/lib/buyer-session";
import { sendResumeEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { org_id, floorplan_id, buyerEmail } = body;

  if (!org_id || !floorplan_id || !buyerEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedEmail = validateEmail(buyerEmail);
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify ownership
  const { data: row } = await supabase
    .from("buyer_sessions")
    .select("id, org_id, floorplan_id")
    .eq("id", sessionId)
    .single();

  if (!row || row.org_id !== org_id || row.floorplan_id !== floorplan_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resumeToken = crypto.randomBytes(32).toString("hex");

  const { error } = await supabase
    .from("buyer_sessions")
    .update({ buyer_email: normalizedEmail, resume_token: resumeToken })
    .eq("id", sessionId);

  if (error) {
    console.error("[save-email] Update error:", error);
    return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
  }

  // Look up org name + floorplan name for email
  const [{ data: org }, { data: fp }] = await Promise.all([
    supabase.from("organizations").select("name, slug").eq("id", org_id).single(),
    supabase.from("floorplans").select("name, slug").eq("id", floorplan_id).single(),
  ]);

  const orgName = org?.name ?? "Your Builder";
  const orgSlug = org?.slug ?? "";
  const fpName = fp?.name ?? "your floorplan";
  const fpSlug = fp?.slug ?? "";

  const appUrl = process.env.APP_URL || "https://withfin.ch";
  const resumeLink = `${appUrl}/${orgSlug}/${fpSlug}?resume=${resumeToken}`;

  // Fire-and-forget — save succeeds even if email fails
  sendResumeEmail(normalizedEmail, resumeLink, orgName, fpName).catch((err) => {
    console.error("[save-email] Failed to send resume email:", err);
  });

  return NextResponse.json({ resumeToken });
}
