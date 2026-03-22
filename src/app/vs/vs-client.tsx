"use client";

import { useEffect, useRef } from "react";
import { useTrack } from "@/hooks/useTrack";

function useScrollDepth(page: string) {
  const track = useTrack();
  const firedRef = useRef(new Set<number>());

  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const percent = Math.round((scrollTop / docHeight) * 100);

      for (const t of thresholds) {
        if (percent >= t && !firedRef.current.has(t)) {
          firedRef.current.add(t);
          track("vs_scroll_depth", { page, depth: t });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [track, page]);
}

export function EnvisionPageTracker() {
  const track = useTrack();
  useScrollDepth("envision");
  useEffect(() => {
    track("vs_page_viewed", { page: "envision" });
  }, [track]);
  return null;
}

export function PdfOptionSheetsPageTracker() {
  const track = useTrack();
  useScrollDepth("pdf-option-sheets");
  useEffect(() => {
    track("vs_page_viewed", { page: "pdf-option-sheets" });
  }, [track]);
  return null;
}
