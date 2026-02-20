"use client";

interface GenerationCounterProps {
  used: number;
  max: number;
  /** Called when a filled dot is clicked — index is 0-based generation number */
  onRecall?: (index: number) => void;
}

export function GenerationCounter({ used, max, onRecall }: GenerationCounterProps) {
  const atCap = used >= max;
  const remaining = Math.max(max - used, 0);

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => {
          const isFilled = i < used;
          return (
            <button
              key={i}
              type="button"
              disabled={!isFilled || !onRecall}
              onClick={() => isFilled && onRecall?.(i)}
              className={`w-2.5 h-2.5 transition-colors ${
                isFilled
                  ? `${atCap ? "bg-amber-400" : "bg-slate-900"} ${onRecall ? "cursor-pointer hover:ring-2 hover:ring-slate-400 hover:ring-offset-1" : ""}`
                  : "bg-slate-200 cursor-default"
              }`}
              title={isFilled ? `View generation ${i + 1}` : undefined}
            />
          );
        })}
      </div>
      <span className={`text-xs whitespace-nowrap ${atCap ? "text-amber-600 font-medium" : "text-slate-400"}`}>
        {atCap ? `${used} of ${max} used` : `${remaining} of ${max} left`}
      </span>
    </div>
  );
}
