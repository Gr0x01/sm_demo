"use client";

interface PhotoQualityBadgeProps {
  result: "pass" | "warn" | "fail" | null;
  feedback?: string | null;
}

const config = {
  pass: { label: "Pass", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  warn: { label: "Warning", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  fail: { label: "Fail", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
} as const;

export function PhotoQualityBadge({ result, feedback }: PhotoQualityBadgeProps) {
  if (!result) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 border border-slate-200">
        Unchecked
      </span>
    );
  }

  const c = config[result];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs ${c.bg} ${c.text} border ${c.border}`}
      title={feedback || undefined}
    >
      {c.label}
    </span>
  );
}
