"use client";

import { useEffect } from "react";
import { useTrack } from "@/hooks/useTrack";

export function PultePageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("learn_page_viewed", { page: "design-center-pulte" });
  }, [track]);
  return null;
}
