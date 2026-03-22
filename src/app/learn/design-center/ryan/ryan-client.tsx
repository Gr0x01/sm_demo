"use client";

import { useEffect } from "react";
import { useTrack } from "@/hooks/useTrack";

export function RyanPageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("learn_page_viewed", { page: "design-center-ryan" });
  }, [track]);
  return null;
}
