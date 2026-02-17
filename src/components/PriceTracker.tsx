"use client";

interface PriceTrackerProps {
  total: number;
}

export function PriceTracker({ total }: PriceTrackerProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total Upgrades</span>
        <span className="text-lg font-bold text-[var(--color-navy)]">
          {total === 0 ? (
            "Base Package"
          ) : (
            <>+${total.toLocaleString()}</>
          )}
        </span>
      </div>
    </div>
  );
}
