"use client";

export interface ProspectInsight {
  label: string;
  value: string;
}

interface UpgradeInsightsProps {
  /** Per-prospect insights from DB */
  prospectInsights?: ProspectInsight[] | null;
  /** Optional closing line (e.g. "Finch pays for itself in month one.") */
  closingLine?: string | null;
}

export function UpgradeInsights({
  prospectInsights,
  closingLine,
}: UpgradeInsightsProps) {
  const hasProspect = prospectInsights && prospectInsights.length > 0;

  return (
    <div className="border-t border-gray-200 pt-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
        The Upgrade Gap
      </p>

      <div className="space-y-2.5">
        {hasProspect &&
          prospectInsights.map((insight, i) => (
            <InsightRow key={`p-${i}`} insight={insight} />
          ))}
      </div>

      {closingLine && (
        <p className="mt-3 text-xs font-medium text-[var(--color-navy)] leading-snug">
          {closingLine}
        </p>
      )}

      <p className="mt-3 text-[10px] text-gray-300 leading-tight">
        Sources: public SEC filings (Toll Brothers, PulteGroup)
      </p>
    </div>
  );
}

function InsightRow({ insight }: { insight: ProspectInsight }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 leading-snug">{insight.label}</p>
      <p className="text-sm font-semibold text-slate-700 leading-snug">
        {insight.value}
      </p>
    </div>
  );
}
