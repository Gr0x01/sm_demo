"use client";

import { useEffect, useRef, useState } from "react";

interface PriceTrackerProps {
  total: number;
}

export function PriceTracker({ total }: PriceTrackerProps) {
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(total);

  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [total]);

  return (
    <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total Upgrades</span>
        <span
          className={`text-lg font-bold text-[var(--color-navy)] ${pulse ? "animate-price-pulse" : ""}`}
        >
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
