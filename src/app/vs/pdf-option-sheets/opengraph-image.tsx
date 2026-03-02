import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt =
  "Replace PDF Option Sheets — Visual Upgrade Selection for Builders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  const logo = readFileSync(join(process.cwd(), "public/finch-logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F8FAFC",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{ width: "100%", height: "6px", backgroundColor: "#1b2d4e" }}
        />

        {/* Content — single centered group */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} height="64" alt="" />
          <p
            style={{
              fontSize: 16,
              color: "#1b2d4e",
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              marginTop: 28,
            }}
          >
            Finch vs PDF Option Sheets
          </p>
          <p
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#0f172a",
              marginTop: 20,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            A price sheet lists upgrades. Finch shows them.
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
