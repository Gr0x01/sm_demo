"use client";

import { useState } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { ClosingCTA } from "@/components/ClosingCTA";

type PageState = "landing" | "picker" | "cta";

export default function Home() {
  const [page, setPage] = useState<PageState>("landing");

  if (page === "landing") {
    return <LandingHero onStart={() => setPage("picker")} />;
  }

  if (page === "cta") {
    return <ClosingCTA onBack={() => setPage("picker")} />;
  }

  return <UpgradePicker onFinish={() => setPage("cta")} />;
}
