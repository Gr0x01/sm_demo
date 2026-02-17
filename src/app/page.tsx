"use client";

import { useState, useEffect } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { ClosingCTA } from "@/components/ClosingCTA";

type PageState = "landing" | "picker" | "cta";

const BUYER_ID = "may-baten";

interface BuyerData {
  buyerName: string;
  planName: string;
  community: string;
}

export default function Home() {
  const [page, setPage] = useState<PageState>("landing");
  const [buyer, setBuyer] = useState<BuyerData | null>(null);

  useEffect(() => {
    fetch(`/api/selections/${BUYER_ID}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBuyer({
            buyerName: data.buyerName,
            planName: data.planName,
            community: data.community,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (page === "landing") {
    return (
      <LandingHero
        onStart={() => setPage("picker")}
        buyerName={buyer?.buyerName}
        planName={buyer?.planName}
        community={buyer?.community}
      />
    );
  }

  if (page === "cta") {
    return <ClosingCTA onBack={() => setPage("picker")} />;
  }

  return (
    <UpgradePicker
      onFinish={() => setPage("cta")}
      buyerId={BUYER_ID}
    />
  );
}
