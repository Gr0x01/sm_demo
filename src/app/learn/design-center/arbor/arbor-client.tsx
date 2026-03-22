"use client";

import { useEffect } from "react";
import { useTrack } from "@/hooks/useTrack";

export function ArborPageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("learn_page_viewed", { page: "design-center-arbor" });
  }, [track]);
  return null;
}
