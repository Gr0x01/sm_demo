import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt =
  "The Hidden Revenue Line — Upgrade Revenue Among Public Homebuilders";
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

        {/* Content */}
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
          <img src={logoSrc} height="48" alt="" />
          <p
            style={{
              fontSize: 16,
              color: "#1b2d4e",
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              marginTop: 24,
            }}
          >
            Original Research
          </p>
          <p
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#0f172a",
              marginTop: 16,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            The Hidden Revenue Line
          </p>
          <p
            style={{
              fontSize: 22,
              color: "#64748b",
              marginTop: 16,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            SEC filings show $104K-$236K per home in upgrade revenue.
          </p>
          <p
            style={{
              fontSize: 18,
              color: "#94a3b8",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            An analysis of 14 public homebuilders.
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
            withfin.ch/research
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
