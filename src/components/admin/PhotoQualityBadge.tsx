"use client";

interface PhotoQualityBadgeProps {
  result: "pass" | "warn" | "fail" | null;
  feedback?: string | null;
}

const config = {
  pass: { label: "Pass", bg: "bg-green-900/40", text: "text-green-400", border: "border-green-800" },
  warn: { label: "Warning", bg: "bg-yellow-900/40", text: "text-yellow-400", border: "border-yellow-800" },
  fail: { label: "Fail", bg: "bg-red-900/40", text: "text-red-400", border: "border-red-800" },
} as const;

export function PhotoQualityBadge({ result, feedback }: PhotoQualityBadgeProps) {
  if (!result) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-neutral-800 text-neutral-500 border border-neutral-700">
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
