"use client";

import { useState, useEffect, useCallback } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { UpgradeSummary } from "@/components/UpgradeSummary";
import type { ContractPhase } from "@/lib/contract-phase";
import type { Category } from "@/types";
import type { StepConfig } from "@/lib/step-config";

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

interface SummaryData {
  selections: Record<string, string>;
  quantities: Record<string, number>;
  generatedImageUrls: Record<string, string>;
}

interface DemoPageClientProps {
  orgId: string;
  orgName: string;
  floorplanName: string;
  community: string;
  categories: Category[];
  steps: StepConfig[];
  contractLockedIds: string[];
  syncPairs: { a: string; b: string; label: string }[];
}

export function DemoPageClient({
  orgId,
  orgName,
  floorplanName,
  community,
  categories,
  steps,
  contractLockedIds,
  syncPairs,
}: DemoPageClientProps) {
  const [page, setPageState] = useState<PageState>(getPageFromUrl);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [contractPhase, setContractPhase] = useState<ContractPhase>("pre-contract");

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

  useEffect(() => {
    const onPopState = () => {
      setPageState(getPageFromUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (page === "landing") {
    return (
      <div key="landing" className="animate-fade-in">
        <LandingHero
          onStart={(phase) => {
            setContractPhase(phase);
            setPage("picker");
          }}
          planName={floorplanName}
          community={community}
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
          planName={`${floorplanName} Plan`}
          community={community}
          categories={categories}
          steps={steps}
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
        categories={categories}
        steps={steps}
        contractLockedIds={contractLockedIds}
        syncPairs={syncPairs}
      />
    </div>
  );
}
