import { ImageResponse } from "next/og";
import { getServiceClient } from "@/lib/supabase";
import { getOrgBySlug, getFloorplan } from "@/lib/db-queries";
import { SESSION_COLUMNS, mapRowToPublicSession } from "@/lib/buyer-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; floorplanSlug: string; token: string }> }
) {
  const { orgSlug, floorplanSlug, token } = await params;

  const supabase = getServiceClient();
  const { data: row } = await supabase
    .from("buyer_sessions")
    .select(SESSION_COLUMNS)
    .eq("resume_token", token)
    .single();

  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const session = mapRowToPublicSession(row);
  const org = await getOrgBySlug(orgSlug);
  if (!org || org.id !== session.orgId) {
    return new Response("Not found", { status: 404 });
  }

  const floorplan = await getFloorplan(org.id, floorplanSlug);
  if (!floorplan || floorplan.id !== session.floorplanId) {
    return new Response("Not found", { status: 404 });
  }

  const accentColor = org.primary_color || "#1b2d4e";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F8FAFC",
          padding: "60px 80px",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            backgroundColor: accentColor,
          }}
        />

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: accentColor,
              lineHeight: 1.1,
            }}
          >
            {org.name}
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "#475569",
            }}
          >
            {floorplan.name} Plan — Upgrade Selections
          </div>
        </div>

        {/* Subtext + Finch attribution */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              color: "#94A3B8",
              fontWeight: 400,
            }}
          >
            Your home selections, visualized.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              color: "#64748B",
              letterSpacing: "0.08em",
            }}
          >
            Powered by{" "}
            <span
              style={{
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontSize: "14px",
              }}
            >
              FINCH
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, max-age=3600",
      },
    }
  );
}
