"use client";

import { useState, useEffect, useCallback } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { UpgradeSummary } from "@/components/UpgradeSummary";
import type { ContractPhase } from "@/lib/contract-phase";

type PageState = "landing" | "picker" | "summary";

const BUYER_ID = "may-baten";
const VALID_PAGES: PageState[] = ["landing", "picker", "summary"];

function getPageFromUrl(): PageState {
  if (typeof window === "undefined") return "landing";
  const params = new URLSearchParams(window.location.search);
  const p = params.get("page");
  if (p && VALID_PAGES.includes(p as PageState)) return p as PageState;
  return "landing";
}

interface BuyerData {
  buyerName: string;
  planName: string;
  community: string;
}

interface SummaryData {
  selections: Record<string, string>;
  quantities: Record<string, number>;
  generatedImageUrls: Record<string, string>;
}

export default function Home() {
  const [page, setPageState] = useState<PageState>(getPageFromUrl);
  const [buyer, setBuyer] = useState<BuyerData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [contractPhase, setContractPhase] = useState<ContractPhase>("pre-contract");

  // Navigate to a page and push a history entry
  const setPage = useCallback((newPage: PageState) => {
    setPageState(newPage);
    const url = new URL(window.location.href);
    if (newPage === "landing") {
      url.searchParams.delete("page");
      url.searchParams.delete("step");
    } else {
      url.searchParams.set("page", newPage);
      if (newPage !== "picker") url.searchParams.delete("step");
    }
    window.history.pushState({}, "", url.toString());
  }, []);

  // Listen for back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      setPageState(getPageFromUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
          onStart={(phase) => {
            setContractPhase(phase);
            setPage("picker");
          }}
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
          generatedImageUrls={summaryData.generatedImageUrls}
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
        contractPhase={contractPhase}
        onNavigateHome={() => setPage("landing")}
      />
    </div>
  );
}
