"use client";

import { useEffect, useRef, useState } from "react";
import { useTrack } from "@/hooks/useTrack";

/* ─── Page View Tracker ─── */
export function VisualizationPageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("research_page_viewed", { page: "visualization-lift" });
  }, [track]);
  return null;
}

/* ─── Animated Bar Charts ─── */
interface BarData {
  label: string;
  value: number;
  displayValue: string;
  verified: boolean;
  note?: string;
}

export function VisualizationLiftCharts({
  revenueData,
  appointmentData,
}: {
  revenueData: BarData[];
  appointmentData: BarData[];
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
            track("research_chart_viewed", {
              chart: "visualization-lift-comparison",
            });
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

  const sourceTag = (verified: boolean) => {
    const base =
      "inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium";
    return verified
      ? `${base} bg-slate-900 text-white`
      : `${base} border border-slate-300 text-slate-500 bg-white`;
  };

  return (
    <div ref={ref} className="space-y-12">
      <div>
        <p className="text-base font-semibold text-slate-900 mb-6">
          Reported Upgrade Revenue Increase
        </p>
        <div className="space-y-4">
          {revenueData.map((bar, index) => (
            <div key={bar.label} className="flex items-center gap-4">
              <div className="w-40 md:w-52 shrink-0">
                <p className="text-sm text-slate-700 font-medium">
                  {bar.label}
                </p>
                <span className={sourceTag(bar.verified)}>
                  {bar.verified ? "Named builder" : "Vendor claim"}
                </span>
              </div>
              <div className="flex-1 relative">
                <div
                  className={`${bar.verified ? "bg-slate-900" : "bg-slate-300"} h-7 flex items-center justify-end px-3`}
                  style={{
                    width: visible ? `${bar.value}%` : "0%",
                    transition: "width 700ms ease-out",
                    transitionDelay: `${index * 80}ms`,
                  }}
                >
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${bar.verified ? "text-white" : "text-slate-700"}`}
                  >
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
          Reported Appointment Time Reduction
        </p>
        <div className="space-y-4">
          {appointmentData.map((bar, index) => (
            <div key={bar.label} className="flex items-center gap-4">
              <div className="w-40 md:w-52 shrink-0">
                <p className="text-sm text-slate-700 font-medium">
                  {bar.label}
                </p>
                <span className={sourceTag(bar.verified)}>
                  {bar.verified ? "Named builder" : "Vendor claim"}
                </span>
              </div>
              <div className="flex-1 relative">
                <div
                  className={`${bar.verified ? "bg-slate-900" : "bg-slate-300"} h-7 flex items-center justify-end px-3`}
                  style={{
                    width: visible ? `${bar.value}%` : "0%",
                    transition: "width 700ms ease-out",
                    transitionDelay: `${(revenueData.length + index) * 80}ms`,
                  }}
                >
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${bar.verified ? "text-white" : "text-slate-700"}`}
                  >
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
