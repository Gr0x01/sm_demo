"use client";

import { useState, useEffect } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { UpgradeSummary } from "@/components/UpgradeSummary";

type PageState = "landing" | "picker" | "summary";

const BUYER_ID = "may-baten";

interface BuyerData {
  buyerName: string;
  planName: string;
  community: string;
}

interface SummaryData {
  selections: Record<string, string>;
  quantities: Record<string, number>;
  generatedImageUrl: string | null;
}

export default function Home() {
  const [page, setPage] = useState<PageState>("landing");
  const [buyer, setBuyer] = useState<BuyerData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

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
      <div key="landing" className="animate-fade-in">
        <LandingHero
          onStart={() => setPage("picker")}
          buyerName={buyer?.buyerName}
          planName={buyer?.planName}
          community={buyer?.community}
        />
      </div>
    );
  }

  if (page === "summary" && summaryData) {
    return (
      <div key="summary" className="animate-fade-in">
        <UpgradeSummary
          selections={summaryData.selections}
          quantities={summaryData.quantities}
          generatedImageUrl={summaryData.generatedImageUrl}
          planName={buyer?.planName ?? "Kinkade Plan"}
          community={buyer?.community ?? "McClain Landing Phase 7"}
          onBack={() => setPage("picker")}
        />
      </div>
    );
  }

  return (
    <div key="picker" className="animate-fade-in">
      <UpgradePicker
        onFinish={(data) => {
          setSummaryData(data);
          setPage("summary");
        }}
        buyerId={BUYER_ID}
      />
    </div>
  );
}
