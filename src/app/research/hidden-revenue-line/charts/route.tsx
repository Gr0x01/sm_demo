import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

const SIZE = { width: 1200, height: 627 };

/* ─── Font ─── */
// Load Baskerville TTF (extracted from macOS system font) for serif headlines
let serifFont: ArrayBuffer | null = null;
try {
  const buf = readFileSync(join(process.cwd(), "src/app/research/hidden-revenue-line/charts/baskerville.ttf"));
  serifFont = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
} catch {
  // Fallback: no serif available
}
const SERIF = serifFont ? "Baskerville" : "serif";

/* ─── Brand Colors (from globals.css / research page) ─── */
const BG = "#FFFFFF";
const SURFACE = "#F1F5F9"; // slate-100
const NAVY = "#1B2D4E"; // --color-navy
const GOLD = "#C5A572"; // --color-secondary
const TEXT = "#334155"; // slate-700
const MUTED = "#64748B"; // slate-500
const DIM = "#94A3B8"; // slate-400
const BORDER = "#E2E8F0"; // slate-200
const BAR_TRACK = "#F1F5F9";

/* ─── Shared Frame ─── */

function Frame({
  children,
  source,
}: {
  children: React.ReactNode;
  source?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BG,
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{ width: "100%", height: 5, backgroundColor: NAVY }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "44px 72px 40px 72px",
        }}
      >
        {children}
      </div>

      {/* Source line */}
      {source && (
        <p
          style={{
            position: "absolute",
            bottom: 20,
            left: 72,
            fontSize: 11,
            color: DIM,
          }}
        >
          {source}
        </p>
      )}

      {/* Watermark */}
      <p
        style={{
          position: "absolute",
          bottom: 20,
          right: 72,
          fontSize: 12,
          color: DIM,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
        }}
      >
        withfin.ch
      </p>
    </div>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        color: MUTED,
        letterSpacing: "0.2em",
        textTransform: "uppercase" as const,
        fontWeight: 600,
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

/* ─── Chart 1: Hero ─── */

function HeroChart() {
  return (
    <Frame>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Eyebrow>Original Research</Eyebrow>
        <h1
          style={{
            fontSize: 80,
            color: NAVY,
            fontFamily: SERIF,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          The Hidden Revenue Line
        </h1>
        <p
          style={{
            fontSize: 26,
            color: MUTED,
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 680,
          }}
        >
          Options & Upgrade Revenue Among Public Homebuilders
        </p>

        {/* Gold divider */}
        <div
          style={{
            width: 48,
            height: 2,
            backgroundColor: GOLD,
            marginTop: 36,
            marginBottom: 16,
          }}
        />

        <p
          style={{
            fontSize: 12,
            color: DIM,
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
          }}
        >
          March 2026 · Finch · SEC EDGAR
        </p>
      </div>
    </Frame>
  );
}

/* ─── Chart 2: Stat Bar ─── */

function StatsChart() {
  const stats = [
    {
      value: "$104K–$236K",
      label: "Options & upgrade revenue per home among builders who disclose",
    },
    {
      value: "8–25%",
      label: "of ASP attributable to options & upgrades",
    },
    {
      value: "3–5 pts",
      label: "Gross margin premium on build-to-order vs. spec\u00a0homes",
    },
  ];

  return (
    <Frame source="Source: SEC EDGAR 10-K filings, earnings call transcripts">
      <Eyebrow>Key Findings</Eyebrow>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.value}
            style={{
              display: "flex",
              flexDirection: "column",
              width: 330,
              height: 220,
              backgroundColor: SURFACE,
              border: `1px solid ${BORDER}`,
              position: "relative",
            }}
          >
            {/* Card top accent */}
            <div
              style={{
                width: "100%",
                height: 3,
                backgroundColor: NAVY,
              }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 24px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 40,
                  color: NAVY,
                  fontFamily: SERIF,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  marginBottom: 8,
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─── Chart 3: Disclosed Builders ─── */

function DisclosedChart() {
  const rows = [
    { label: "Toll Brothers FY24", value: 203, display: "$203K", pct: "20.8% of ASP" },
    { label: "Toll Brothers FY23", value: 236, display: "$236K", pct: "23.0% of ASP" },
    { label: "Toll Brothers FY22", value: 190, display: "$190K", pct: "20.6% of ASP" },
    { label: "PulteGroup Q2 '24", value: 104, display: "$104K", pct: "18.9% of ASP" },
  ];
  const maxVal = 236;

  return (
    <Frame source="Source: Toll Brothers 10-K FY2022–2024; PulteGroup Q2 2024 earnings">
      <Eyebrow>Builders Who Disclose</Eyebrow>
      <h2
        style={{
          fontSize: 32,
          color: NAVY,
          fontFamily: SERIF,
          lineHeight: 1.1,
          marginBottom: 36,
        }}
      >
        Upgrade Revenue Per Home
      </h2>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontSize: 15,
                color: TEXT,
                fontWeight: 500,
                width: 200,
                textAlign: "right",
                paddingRight: 20,
              }}
            >
              {r.label}
            </p>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Bar with track */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  height: 40,
                  backgroundColor: BAR_TRACK,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div
                  style={{
                    width: `${(r.value / maxVal) * 100}%`,
                    height: "100%",
                    backgroundColor: NAVY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 14,
                  }}
                >
                  <span style={{ fontSize: 18, color: "#FFFFFF", fontWeight: 700 }}>
                    {r.display}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 13, color: MUTED, width: 110 }}>
                {r.pct}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─── Chart 4: Segment Benchmarks ─── */

function SegmentsChart() {
  const segments = [
    { label: "Luxury / Semi-Custom", low: 20, high: 25, color: NAVY },
    { label: "Move-Up", low: 12, high: 20, color: "#2D4A6E" },
    { label: "Entry-Level / Production", low: 8, high: 15, color: "#4A6A8E" },
    { label: "Weighted Average", low: 10, high: 15, color: GOLD },
  ];
  const scale = 30;

  return (
    <Frame source="Source: Toll Brothers, PulteGroup, Robino-Corrozi, ProBuilder survey">
      <Eyebrow>Benchmark Ranges</Eyebrow>
      <h2
        style={{
          fontSize: 28,
          color: NAVY,
          fontFamily: SERIF,
          lineHeight: 1.1,
          marginBottom: 36,
        }}
      >
        Upgrade Revenue as % of ASP by Segment
      </h2>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {segments.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontSize: 15,
                color: TEXT,
                fontWeight: 500,
                width: 240,
                textAlign: "right",
                paddingRight: 20,
              }}
            >
              {s.label}
            </p>
            <div
              style={{
                flex: 1,
                display: "flex",
                position: "relative",
                height: 36,
              }}
            >
              {/* Track line */}
              <div
                style={{
                  position: "absolute",
                  top: 17,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: BORDER,
                }}
              />
              {/* Range bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${(s.low / scale) * 100}%`,
                  width: `${((s.high - s.low) / scale) * 100}%`,
                  height: 36,
                  backgroundColor: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 15, color: "#FFFFFF", fontWeight: 700 }}>
                  {s.low}–{s.high}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─── Chart 5: Revenue Gap ─── */

function GapChart() {
  return (
    <Frame source="Derived from SEC data. See methodology: withfin.ch/research/hidden-revenue-line">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* Left: columns */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 440,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: MUTED,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            200-home move-up builder · $400K ASP
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 40,
            }}
          >
            {/* 12% column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <p style={{ fontSize: 17, color: MUTED, fontWeight: 600 }}>
                $9.6M
              </p>
              <div
                style={{
                  width: 120,
                  height: 140,
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 24, color: DIM, fontWeight: 700 }}>
                  12%
                </span>
              </div>
              <p style={{ fontSize: 12, color: DIM }}>$48K/home</p>
            </div>

            {/* 20% column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <p style={{ fontSize: 17, color: NAVY, fontWeight: 600 }}>
                $16.0M
              </p>
              <div
                style={{
                  width: 120,
                  height: 240,
                  backgroundColor: NAVY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 24, color: "#FFFFFF", fontWeight: 700 }}>
                  20%
                </span>
              </div>
              <p style={{ fontSize: 12, color: MUTED }}>$80K/home</p>
            </div>
          </div>
        </div>

        {/* Right: callout */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 40,
          }}
        >
          <Eyebrow>The Revenue Gap</Eyebrow>
          <p
            style={{
              fontSize: 64,
              color: GOLD,
              fontFamily: SERIF,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              marginBottom: 12,
            }}
          >
            $6.4M
          </p>
          <div
            style={{
              width: 48,
              height: 2,
              backgroundColor: GOLD,
              marginBottom: 16,
            }}
          />
          <p
            style={{
              fontSize: 17,
              color: TEXT,
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: 380,
            }}
          >
            annual revenue gap
          </p>
          <p
            style={{
              fontSize: 14,
              color: MUTED,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            $2.5–3.5M in additional gross profit
          </p>
        </div>
      </div>
    </Frame>
  );
}

/* ─── Route Handler ─── */

const CHARTS: Record<string, () => React.ReactElement> = {
  hero: HeroChart,
  stats: StatsChart,
  disclosed: DisclosedChart,
  segments: SegmentsChart,
  gap: GapChart,
};

export async function GET(request: NextRequest) {
  const chart = request.nextUrl.searchParams.get("chart") ?? "hero";
  const render = CHARTS[chart];

  if (!render) {
    return new Response(
      `Unknown chart: ${chart}. Options: ${Object.keys(CHARTS).join(", ")}`,
      { status: 400 }
    );
  }

  const fonts = serifFont
    ? [{ name: "Baskerville", data: serifFont, weight: 400 as const }]
    : [];

  return new ImageResponse(render(), { ...SIZE, fonts });
}
