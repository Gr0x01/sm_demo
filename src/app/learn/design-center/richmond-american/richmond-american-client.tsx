"use client";

import { useEffect } from "react";
import { useTrack } from "@/hooks/useTrack";

export function RichmondAmericanPageTracker() {
  const track = useTrack();
  useEffect(() => {
    track("learn_page_viewed", { page: "design-center-richmond-american" });
  }, [track]);
  return null;
}
