import { ImageResponse } from "next/og";

export const alt = "Finch — Upgrade Visualization for Home Builders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          <p
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Finch
          </p>
          <p
            style={{
              fontSize: 28,
              color: "#64748b",
              marginTop: 24,
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
            First floor plan live in 48 hours. No software to learn.
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
