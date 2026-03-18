"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { UpgradePicker } from "@/components/UpgradePicker";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileStickyFooter } from "@/components/MobileStickyFooter";
import { UpgradeInsights } from "@/components/UpgradeInsights";
import type { ProspectInsight } from "@/components/UpgradeInsights";
import type { Category } from "@/types";
import type { StepConfig } from "@/lib/step-config";

const SESSION_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

function getCookieName(fpSlug: string): string {
  return `finch_prospect_${fpSlug}`;
}

function getSessionCookie(fpSlug: string): string | null {
  const name = getCookieName(fpSlug).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(fpSlug: string, sessionId: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${getCookieName(fpSlug)}=${encodeURIComponent(sessionId)}; Path=/; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}${secure}`;
}

interface ProspectDemoClientProps {
  orgId: string;
  floorplanId: string;
  floorplanSlug: string;
  floorplanName: string;
  coverImageUrl: string | null;
  categories: Category[];
  steps: StepConfig[];
  loomUrl: string | null;
  calendlyUrl: string | null;
  prospectInsights: { insights: ProspectInsight[]; closingLine?: string } | null;
}

export function ProspectDemoClient({
  orgId,
  floorplanId,
  floorplanSlug,
  floorplanName,
  coverImageUrl,
  categories,
  steps,
  loomUrl,
  calendlyUrl,
  prospectInsights,
}: ProspectDemoClientProps) {
  const posthog = usePostHog();
  const viewedRef = useRef(false);
  const initRef = useRef(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Track page view once
  useEffect(() => {
    if (!posthog || viewedRef.current) return;
    viewedRef.current = true;
    posthog.capture("prospect_page_viewed", {
      prospect: floorplanSlug,
      floorplanName,
    });
  }, [posthog, floorplanSlug, floorplanName]);

  // Create buyer session on mount (required for generation)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function initSession() {
      // Try cookie first
      const cookieId = getSessionCookie(floorplanSlug);
      if (cookieId) {
        try {
          const res = await fetch(
            `/api/buyer-sessions/${cookieId}?org_id=${orgId}&floorplan_id=${floorplanId}`,
          );
          if (res.ok) {
            setSessionId(cookieId);
            return;
          }
        } catch {
          // Fall through to create
        }
      }

      // Create new anonymous session
      try {
        const res = await fetch("/api/buyer-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: orgId, floorplan_id: floorplanId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.sessionId);
          setSessionCookie(floorplanSlug, data.sessionId);
        }
      } catch {
        // Session creation failed — picker still works, just no generation
      }
    }

    initSession();
  }, [orgId, floorplanId, floorplanSlug]);

  const trackEvent = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      posthog?.capture(event, { prospect: floorplanSlug, ...properties });
    },
    [posthog, floorplanSlug],
  );

  // Validate and extract Loom embed URL
  const loomEmbedUrl = loomUrl?.startsWith("https://www.loom.com/")
    ? loomUrl.includes("/embed/")
      ? loomUrl
      : loomUrl.replace("/share/", "/embed/")
    : null;

  // Validate Calendly URL
  const safeCalendlyUrl = calendlyUrl?.startsWith("https://calendly.com/")
    ? calendlyUrl
    : null;

  return (
    <div className="min-h-screen bg-white">
      <SiteNav
        links={[
          { label: "Home", href: "/" },
          { label: "Research", href: "/research/hidden-revenue-line" },
        ]}
      />

      {/* Hero */}
      <section className="px-6 pt-8 pb-4 md:pt-20 md:pb-14">
        <div className="max-w-5xl mx-auto flex flex-col-reverse md:flex-row items-center gap-6 md:gap-14">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl leading-[1.1] tracking-[-0.02em] text-slate-900 mb-3">
              {floorplanName}
            </h1>
            <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-lg">
              I grabbed a photo from your model and set up a quick version of the
              tool I&rsquo;ve been building. Figured it was easier to show you than
              explain it.
            </p>
          </div>
          {coverImageUrl && (
            <div className="w-full md:w-[340px] lg:w-[400px] shrink-0">
              <img
                src={coverImageUrl}
                alt={floorplanName}
                className="w-full shadow-lg"
              />
            </div>
          )}
        </div>
      </section>

      {/* Loom embed */}
      {loomEmbedUrl && (
        <section className="px-6 pb-12 md:pb-16">
          <div className="max-w-3xl mx-auto">
            <div
              className="relative w-full overflow-hidden border border-slate-200"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                src={loomEmbedUrl}
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                onLoad={() => trackEvent("prospect_loom_loaded")}
              />
            </div>
          </div>
        </section>
      )}

      {/* Upgrade picker — single step, no wizard chrome */}
      <section className="pb-4 md:pb-12">
        <UpgradePicker
          orgId={orgId}
          orgSlug="demo"
          floorplanId={floorplanId}
          floorplanSlug={floorplanSlug}
          sessionId={sessionId ?? undefined}
          orgName="Finch"
          logoUrl={null}
          planName={floorplanName}
          community=""
          categories={categories}
          steps={steps}
          contractLockedIds={[]}
          syncPairs={[]}
          contractPhase="pre-contract"
          onFinish={() => {}}
          onSessionSaved={() => {}}
          onSessionResumed={() => {}}
          onNavigateHome={() => {}}
          hideWizardControls
          sidebarFooter={
            <UpgradeInsights
              prospectInsights={prospectInsights?.insights}
              closingLine={prospectInsights?.closingLine}
            />
          }
        />
      </section>

      {/* Calendly CTA */}
      {safeCalendlyUrl && (
        <section className="px-6 pb-20 md:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="border-t border-slate-100 pt-12">
              <p className="text-base md:text-lg text-slate-600 mb-6">
                If this is interesting, I&rsquo;d love to walk you through how it
                works on your end. 15 minutes.
              </p>
              <a
                href={safeCalendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("prospect_calendly_clicked")}
                className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
              >
                Book 15 Minutes
              </a>
              <p className="mt-4 text-xs text-slate-400">
                Or reach out directly at{" "}
                <a
                  href="mailto:hello@withfin.ch"
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  hello@withfin.ch
                </a>
              </p>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />

      {/* Mobile sticky footer — Preview + Visualize */}
      <MobileStickyFooter
        previewImageUrl={steps[0]?.photos?.[0]?.imageUrl ?? null}
        previewLabel={steps[0]?.photos?.[0]?.label ?? "Kitchen"}
        primaryAction={{
          label: "Visualize",
          onClick: () => {
            // Scroll to the photo card's Visualize button
            const btn = document.querySelector("[data-visualize-btn]") as HTMLElement | null;
            if (btn) {
              btn.scrollIntoView({ behavior: "smooth", block: "center" });
              btn.click();
            }
          },
        }}
      />
    </div>
  );
}
