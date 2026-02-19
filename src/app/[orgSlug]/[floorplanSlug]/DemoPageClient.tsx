"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { UpgradeSummary } from "@/components/UpgradeSummary";
import type { ContractPhase } from "@/lib/contract-phase";
import type { Category } from "@/types";
import type { StepConfig } from "@/lib/step-config";

type PageState = "landing" | "picker" | "summary";

const BUYER_ID = "may-baten";
const VALID_PAGES: PageState[] = ["landing", "picker", "summary"];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function getPageFromUrl(): PageState {
  if (typeof window === "undefined") return "landing";
  const params = new URLSearchParams(window.location.search);
  const p = params.get("page");
  if (p && VALID_PAGES.includes(p as PageState)) return p as PageState;
  return "landing";
}

/** Shift a hex color lighter (positive amount) or darker (negative). */
function shiftHex(hex: string, amount: number): string {
  if (!HEX_RE.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const shift = (c: number) => Math.min(255, Math.max(0, Math.round(
    amount > 0 ? c + (255 - c) * amount : c * (1 + amount)
  )));
  return `#${shift(r).toString(16).padStart(2, "0")}${shift(g).toString(16).padStart(2, "0")}${shift(b).toString(16).padStart(2, "0")}`;
}

interface SummaryData {
  selections: Record<string, string>;
  quantities: Record<string, number>;
  generatedImageUrls: Record<string, string>;
}

export interface OrgTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
}

interface DemoPageClientProps {
  orgName: string;
  orgTheme: OrgTheme;
  floorplanName: string;
  community: string;
  categories: Category[];
  steps: StepConfig[];
  contractLockedIds: string[];
  syncPairs: { a: string; b: string; label: string }[];
}

export function DemoPageClient({
  orgName,
  orgTheme,
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

  const themeVars = useMemo(() => ({
    "--color-navy": orgTheme.primaryColor,
    "--color-navy-hover": shiftHex(orgTheme.primaryColor, -0.15),
    "--color-accent": orgTheme.accentColor,
    "--color-secondary": orgTheme.secondaryColor,
  } as React.CSSProperties), [orgTheme]);

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
      <div key="landing" className="animate-fade-in" style={themeVars}>
        <LandingHero
          onStart={(phase) => {
            setContractPhase(phase);
            setPage("picker");
          }}
          orgName={orgName}
          planName={floorplanName}
          community={community}
        />
      </div>
    );
  }

  if (page === "summary" && summaryData) {
    return (
      <div key="summary" className="animate-fade-in" style={themeVars}>
        <UpgradeSummary
          selections={summaryData.selections}
          quantities={summaryData.quantities}
          generatedImageUrls={summaryData.generatedImageUrls}
          planName={`${floorplanName} Plan`}
          community={community}
          orgName={orgName}
          logoUrl={orgTheme.logoUrl}
          categories={categories}
          steps={steps}
          onBack={() => setPage("picker")}
        />
      </div>
    );
  }

  return (
    <div key="picker" className="animate-fade-in" style={themeVars}>
      <UpgradePicker
        onFinish={(data) => {
          setSummaryData(data);
          setPage("summary");
        }}
        buyerId={BUYER_ID}
        contractPhase={contractPhase}
        onNavigateHome={() => setPage("landing")}
        orgName={orgName}
        logoUrl={orgTheme.logoUrl}
        planName={floorplanName}
        community={community}
        categories={categories}
        steps={steps}
        contractLockedIds={contractLockedIds}
        syncPairs={syncPairs}
      />
    </div>
  );
}
