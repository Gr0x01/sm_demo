import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { getServiceClient } from "@/lib/supabase";
import { sendAdminInviteEmail } from "@/lib/email";

const inviteSchema = z.object({
  org_id: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;
    const { email, role } = parsed.data;

    // Check if already a member or has a pending invite
    const { data: existing } = await supabase
      .from("org_users")
      .select("id, user_id, invited_email")
      .eq("org_id", orgId)
      .or(`invited_email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      if (existing[0].user_id) {
        return NextResponse.json({ error: "User is already a member" }, { status: 409 });
      }
      return NextResponse.json({ error: "Invite already pending for this email" }, { status: 409 });
    }

    // Get org name for the email
    const { data: orgDetails } = await supabase
      .from("organizations")
      .select("name, primary_color, secondary_color")
      .eq("id", orgId)
      .single();

    const orgName = orgDetails?.name ?? "your organization";

    // Check if user already has an auth account — link directly if so
    const serviceClient = getServiceClient();
    const { data: existingUserId } = await serviceClient
      .rpc("get_auth_user_id_by_email", { lookup_email: email });

    // Insert — linked directly if user exists, pending invite otherwise
    const { error: insertError } = await supabase
      .from("org_users")
      .insert({
        org_id: orgId,
        role,
        ...(existingUserId
          ? { user_id: existingUserId }
          : { invited_email: email, invited_at: new Date().toISOString() }),
      });

    if (insertError) {
      console.error("[invite] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    // Send invite email
    const loginLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://withfin.ch"}/admin/login`;
    await sendAdminInviteEmail(
      email,
      loginLink,
      orgName,
      role,
      orgDetails?.primary_color,
      orgDetails?.secondary_color
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[invite] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
