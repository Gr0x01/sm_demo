"use client";

import { useEffect, useRef, useState } from "react";
import { useTrack } from "@/hooks/useTrack";

/* ─── Page View Tracker ─── */
export function ResearchPageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("research_page_viewed", { page: "hidden-revenue-line" });
  }, [track]);
  return null;
}

/* ─── Animated Bar Charts ─── */
interface BarData {
  label: string;
  value: number;
  displayValue: string;
  segment: string;
  note?: string;
}

export function AnimatedBarCharts({
  disclosedData,
  benchmarkData,
}: {
  disclosedData: BarData[];
  benchmarkData: BarData[];
}) {
  const track = useTrack();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const trackedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!trackedRef.current) {
            track("research_chart_viewed", { chart: "upgrade-revenue-segments" });
            trackedRef.current = true;
          }
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [track]);

  const segmentTag = (segment: string) => {
    const base = "inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium";
    switch (segment) {
      case "Luxury":
        return `${base} bg-slate-900 text-white`;
      case "Move-Up":
        return `${base} bg-slate-200 text-slate-800`;
      case "Entry-Level":
        return `${base} border border-slate-300 text-slate-600 bg-white`;
      case "Mixed":
        return `${base} bg-slate-100 text-slate-700`;
      default:
        return `${base} bg-slate-100 text-slate-700`;
    }
  };

  return (
    <div ref={ref} className="space-y-12">
      <div>
        <p className="text-base font-semibold text-slate-900 mb-6">
          Options & Upgrade Revenue Per Home — Disclosed Data
        </p>
        <div className="space-y-4">
          {disclosedData.map((bar, index) => (
            <div key={bar.label} className="flex items-center gap-4">
              <div className="w-40 md:w-52 shrink-0">
                <p className="text-sm text-slate-700 font-medium">{bar.label}</p>
                <span className={segmentTag(bar.segment)}>{bar.segment}</span>
              </div>
              <div className="flex-1 relative">
                <div
                  className="bg-slate-900 h-7 flex items-center justify-end px-3"
                  style={{
                    width: visible ? `${bar.value}%` : "0%",
                    transition: "width 700ms ease-out",
                    transitionDelay: `${index * 80}ms`,
                  }}
                >
                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                    {bar.displayValue}
                  </span>
                </div>
              </div>
              {bar.note && (
                <p className="hidden md:block text-xs text-slate-400 w-28 shrink-0">
                  {bar.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-base font-semibold text-slate-900 mb-6">
          Estimated Upgrade Revenue as % of ASP by Segment
        </p>
        <div className="space-y-4">
          {benchmarkData.map((bar, index) => (
            <div key={bar.label} className="flex items-center gap-4">
              <div className="w-40 md:w-52 shrink-0">
                <p className="text-sm text-slate-700 font-medium">{bar.label}</p>
                <span className={segmentTag(bar.segment)}>{bar.segment}</span>
              </div>
              <div className="flex-1 relative">
                <div
                  className="bg-slate-900 h-7 flex items-center justify-end px-3"
                  style={{
                    width: visible ? `${bar.value}%` : "0%",
                    transition: "width 700ms ease-out",
                    transitionDelay: `${(disclosedData.length + index) * 80}ms`,
                  }}
                >
                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                    {bar.displayValue}
                  </span>
                </div>
              </div>
              {bar.note && (
                <p className="hidden md:block text-xs text-slate-400 w-28 shrink-0">
                  {bar.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
