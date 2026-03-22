"use client";

import { useEffect } from "react";
import { useTrack } from "@/hooks/useTrack";

export function LearnIndexTracker() {
  const track = useTrack();
  useEffect(() => {
    track("learn_page_viewed", { page: "learn-index" });
  }, [track]);
  return null;
}
