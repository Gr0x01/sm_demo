import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Finch — Upgrade Visualization for Home Builders";
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
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            width: "100%",
            height: "6px",
            backgroundColor: "#1b2d4e",
          }}
        />

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} height="56" alt="" />
          <p
            style={{
              fontSize: 28,
              color: "#64748b",
              marginTop: 32,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Upgrade visualization for home builders.
          </p>
          <p
            style={{
              fontSize: 22,
              color: "#94a3b8",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            First floor plan live in days, not months. No software to learn.
          </p>
        </div>

        {/* Bottom URL bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "20px 0 28px",
          }}
        >
          <p
            style={{
              fontSize: 18,
              color: "#94a3b8",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}
          >
            withfin.ch
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
