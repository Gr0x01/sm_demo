"use client";

import { useEffect } from "react";
import { useTrack } from "@/hooks/useTrack";

export function LearnPageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("learn_page_viewed", { page: "new-construction-upgrades" });
  }, [track]);
  return null;
}
