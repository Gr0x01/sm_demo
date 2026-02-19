"use client";

interface GenerationCounterProps {
  used: number;
  max: number;
}

export function GenerationCounter({ used, max }: GenerationCounterProps) {
  if (used === 0) return null;

  const atCap = used >= max;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 transition-colors ${
              i < used ? (atCap ? "bg-amber-400" : "bg-slate-900") : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs ${atCap ? "text-amber-600 font-medium" : "text-slate-400"}`}>
        {used} of {max} generations
      </span>
    </div>
  );
}
