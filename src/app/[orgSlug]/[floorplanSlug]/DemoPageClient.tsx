"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LandingHero } from "@/components/LandingHero";
import { UpgradePicker } from "@/components/UpgradePicker";
import { UpgradeSummary } from "@/components/UpgradeSummary";
import type { ContractPhase } from "@/lib/contract-phase";
import type { Category } from "@/types";
import type { StepConfig } from "@/lib/step-config";

type PageState = "landing" | "picker" | "summary";

const VALID_PAGES: PageState[] = ["landing", "picker", "summary"];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const SESSION_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

function getPageFromUrl(): PageState {
  if (typeof window === "undefined") return "landing";
  const params = new URLSearchParams(window.location.search);
  const p = params.get("page");
  if (p && VALID_PAGES.includes(p as PageState)) return p as PageState;
  // If there's a resume token, go straight to picker
  if (params.get("resume")) return "picker";
  return "landing";
}

function getCookieName(orgSlug: string, fpSlug: string): string {
  return `finch_session_${orgSlug}_${fpSlug}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSessionCookie(orgSlug: string, fpSlug: string): string | null {
  const name = escapeRegex(getCookieName(orgSlug, fpSlug));
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(orgSlug: string, fpSlug: string, sessionId: string): void {
  const name = getCookieName(orgSlug, fpSlug);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(sessionId)}; Path=/; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}${secure}`;
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

interface BuyerSessionState {
  sessionId: string;
  buyerEmail?: string;
  resumeToken?: string;
}

interface DemoPageClientProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgTheme: OrgTheme;
  floorplanId: string;
  floorplanSlug: string;
  floorplanName: string;
  community: string;
  categories: Category[];
  steps: StepConfig[];
  contractLockedIds: string[];
  syncPairs: { a: string; b: string; label: string }[];
  generationCap?: number;
}

export function DemoPageClient({
  orgId,
  orgSlug,
  orgName,
  orgTheme,
  floorplanId,
  floorplanSlug,
  floorplanName,
  community,
  categories,
  steps,
  contractLockedIds,
  syncPairs,
  generationCap,
}: DemoPageClientProps) {
  const [page, setPageState] = useState<PageState>(getPageFromUrl);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [contractPhase, setContractPhase] = useState<ContractPhase>("pre-contract");

  // Session state
  const [buyerSession, setBuyerSession] = useState<BuyerSessionState | null>(null);
  const [initialSelections, setInitialSelections] = useState<Record<string, string> | null>(null);
  const [initialQuantities, setInitialQuantities] = useState<Record<string, number> | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const initRef = useRef(false);

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
    url.searchParams.delete("resume");
    window.history.pushState({}, "", url.toString());
  }, []);

  // Initialize buyer session on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function initSession() {
      const params = new URLSearchParams(window.location.search);
      const resumeToken = params.get("resume");

      // 1. Resume via token (from email link)
      if (resumeToken) {
        try {
          const res = await fetch(`/api/buyer-sessions/resume/${resumeToken}`);
          if (res.ok) {
            const session = await res.json();

            // If the session belongs to a different org/floorplan, redirect there
            if (session.orgSlug && session.floorplanSlug &&
                (session.orgSlug !== orgSlug || session.floorplanSlug !== floorplanSlug)) {
              window.location.href = `/${session.orgSlug}/${session.floorplanSlug}?resume=${resumeToken}&page=picker`;
              return;
            }

            setBuyerSession({
              sessionId: session.id,
              buyerEmail: session.buyerEmail ?? undefined,
            });
            setInitialSelections(session.selections);
            setInitialQuantities(session.quantities);
            setSessionCookie(orgSlug, floorplanSlug, session.id);
            setToast("Welcome back! Your selections have been restored.");
            // Clean resume param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete("resume");
            if (!url.searchParams.get("page")) url.searchParams.set("page", "picker");
            window.history.replaceState({}, "", url.toString());
            setSessionReady(true);
            return;
          }
        } catch {
          // Fall through to cookie/create
        }
      }

      // 2. Resume via cookie
      const cookieSessionId = getSessionCookie(orgSlug, floorplanSlug);
      if (cookieSessionId) {
        try {
          const res = await fetch(`/api/buyer-sessions/${cookieSessionId}?org_id=${orgId}&floorplan_id=${floorplanId}`);
          if (res.ok) {
            const session = await res.json();
            setBuyerSession({
              sessionId: session.id,
              buyerEmail: session.buyerEmail ?? undefined,
            });
            setInitialSelections(session.selections);
            setInitialQuantities(session.quantities);
            setSessionReady(true);
            return;
          }
        } catch {
          // Fall through to create
        }
      }

      // 3. Create new anonymous session
      try {
        const res = await fetch("/api/buyer-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: orgId, floorplan_id: floorplanId }),
        });
        if (res.ok) {
          const { sessionId } = await res.json();
          setBuyerSession({ sessionId });
          setSessionCookie(orgSlug, floorplanSlug, sessionId);
        }
      } catch {
        // Session creation failed — picker still works, just no persistence
      }
      setSessionReady(true);
    }

    initSession();
  }, [orgId, orgSlug, floorplanId, floorplanSlug]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onPopState = () => {
      setPageState(getPageFromUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleSessionSaved = useCallback((email: string, resumeToken: string) => {
    setBuyerSession((prev) => prev ? { ...prev, buyerEmail: email, resumeToken } : prev);
  }, []);

  const handleSessionResumed = useCallback((session: { id: string; buyerEmail?: string | null; selections: Record<string, string>; quantities: Record<string, number> }) => {
    setBuyerSession((prev) => ({
      ...(prev ?? { sessionId: session.id }),
      sessionId: session.id,
      buyerEmail: session.buyerEmail ?? undefined,
    }));
    setInitialSelections(session.selections);
    setInitialQuantities(session.quantities);
    setSessionCookie(orgSlug, floorplanSlug, session.id);
  }, [orgSlug, floorplanSlug]);

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
        saveUrl={buyerSession ? `/api/buyer-sessions/${buyerSession.sessionId}` : undefined}
        orgId={orgId}
        floorplanId={floorplanId}
        initialSelections={sessionReady ? initialSelections : undefined}
        initialQuantities={sessionReady ? initialQuantities : undefined}
        sessionId={buyerSession?.sessionId}
        buyerEmail={buyerSession?.buyerEmail}
        orgSlug={orgSlug}
        floorplanSlug={floorplanSlug}
        onSessionSaved={handleSessionSaved}
        onSessionResumed={handleSessionResumed}
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
        generationCap={generationCap}
      />
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
