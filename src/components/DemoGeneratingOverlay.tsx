"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "./LogoLoader";

const GENERATING_MESSAGES = [
  "Visualizations take up to 60 seconds",
  "Each result is saved so the next person sees it instantly",
];

export function DemoGeneratingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex(1);
        setFading(false);
      }, 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <LogoLoader className="w-12 h-auto text-[var(--color-navy)] mb-3" />
      <p
        className="text-xs font-medium text-[var(--color-navy)] text-center px-4 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {GENERATING_MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
