import { NextResponse } from "next/server";
import { buyerResumeEmail, adminInviteEmail } from "@/lib/email-templates";

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const template = searchParams.get("template");

  let html: string;

  switch (template) {
    case "buyer-resume":
      ({ html } = buyerResumeEmail({
        floorplanName: "Kinkade III",
        resumeLink: "https://withfin.ch/stone-martin/kinkade-iii?resume=abc123",
        orgName: "Stone Martin Builders",
        orgPrimaryColor: "#8B2332",
        orgSecondaryColor: "#C5A572",
      }));
      break;

    case "admin-invite":
      ({ html } = adminInviteEmail({
        orgName: "Stone Martin Builders",
        role: "admin",
        loginLink: "https://withfin.ch/auth/callback?code=abc123&next=/admin/stone-martin",
        orgPrimaryColor: "#8B2332",
        orgSecondaryColor: "#C5A572",
      }));
      break;

    default:
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;">
          <h2>Email Preview</h2>
          <ul>
            <li><a href="?template=buyer-resume">Buyer Resume Email</a></li>
            <li><a href="?template=admin-invite">Admin Invite Email</a></li>
          </ul>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
