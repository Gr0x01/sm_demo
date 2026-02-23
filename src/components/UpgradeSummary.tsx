"use client";

import { useMemo, useState } from "react";
import { calculateTotal, formatPrice } from "@/lib/pricing";
import { buildUpgradeGroups } from "@/lib/upgrade-groups";
import type { Category } from "@/types";
import type { StepConfig } from "@/lib/step-config";

interface UpgradeSummaryProps {
  selections: Record<string, string>;
  quantities: Record<string, number>;
  generatedImageUrls: Record<string, string>;
  planName: string;
  community: string;
  orgName: string;
  logoUrl: string | null;
  logoType?: "icon" | "wordmark";
  categories: Category[];
  steps: StepConfig[];
  onBack: () => void;
  resumeToken?: string;
  orgSlug?: string;
  floorplanSlug?: string;
  isSubdomain?: boolean;
}

export function UpgradeSummary({
  selections,
  quantities,
  generatedImageUrls,
  planName,
  community,
  orgName,
  logoUrl,
  logoType = "icon",
  categories,
  steps,
  onBack,
  resumeToken,
  orgSlug,
  floorplanSlug,
  isSubdomain: isSubdomainProp = false,
}: UpgradeSummaryProps) {
  const [shareCopied, setShareCopied] = useState(false);

  const shareUrl = resumeToken && orgSlug && floorplanSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${isSubdomainProp ? "" : `/${orgSlug}`}/${floorplanSlug}/summary/${resumeToken}`
    : null;

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // noop
    }
  };
  // Steps that have hero images to display
  const roomImages = useMemo(() =>
    steps
      .filter((s) => {
        const img = Array.isArray(s.heroImage) ? s.heroImage[0] : s.heroImage;
        return img && img.length > 0;
      })
      .map((s) => ({
        stepId: s.id,
        label: s.name,
        src: Array.isArray(s.heroImage) ? s.heroImage[0] : s.heroImage,
      })),
    [steps]
  );

  const total = useMemo(
    () => calculateTotal(selections, quantities, categories),
    [selections, quantities, categories]
  );

  const upgradeGroups = useMemo(
    () => buildUpgradeGroups(selections, quantities, steps, categories),
    [selections, quantities, steps, categories]
  );

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Nav bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 print:static print:bg-white print:backdrop-blur-none">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <button
                onClick={onBack}
                className="cursor-pointer hover:opacity-70 transition-opacity no-print"
              >
                <img src={logoUrl} alt={orgName} className="h-5" />
              </button>
            )}
            {logoUrl && (
              <img src={logoUrl} alt={orgName} className="h-5 hidden print:block" />
            )}
            <button
              onClick={onBack}
              className="text-xs font-medium text-gray-500 hover:text-[var(--color-navy)] transition-colors cursor-pointer no-print"
            >
              &larr; Back
            </button>
          </div>
          <div className="flex items-center gap-3 no-print">
            {shareUrl && (
              <button
                onClick={handleShare}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-600 hover:text-[var(--color-navy)] hover:border-gray-300 transition-colors cursor-pointer"
              >
                {shareCopied ? "Copied!" : "Share"}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[var(--color-navy)] text-white text-xs font-semibold hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-lg font-bold text-[var(--color-navy)]">
            Your Selections
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {planName}{community ? ` \u00B7 ${community}` : ""}
          </p>
        </div>
        {/* Room Images */}
        <div className="grid grid-cols-2 gap-2 mb-8">
          {roomImages.map((room) => {
            const generatedUrl = generatedImageUrls[room.stepId];
            const imgSrc = generatedUrl || room.src;

            return (
              <div key={room.stepId} className="relative overflow-hidden">
                <img
                  src={imgSrc}
                  alt={room.label}
                  className="w-full aspect-[16/10] object-cover"
                />
              </div>
            );
          })}
        </div>

        {/* Upgrade List */}
        <div className="space-y-6">
          {upgradeGroups.length > 0 ? (
            upgradeGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent)] mb-3">
                  {group.title}
                </h2>
                <div className="border border-gray-200">
                  {group.items.map((item, i) => (
                    <div
                      key={`${group.title}-${i}`}
                      className={`flex items-center justify-between px-4 py-3 text-sm ${
                        i > 0 ? "border-t border-gray-100" : ""
                      }`}
                    >
                      <div>
                        <span className="font-medium text-[var(--color-navy)]">
                          {item.name}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {item.optionName}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-gray-400 ml-1">
                            &times; {item.quantity}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-[var(--color-navy)] whitespace-nowrap ml-4">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="border border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              No paid upgrades — all selections are the included options.
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-4 border-t-2 border-[var(--color-navy)]">
            <span className="text-base font-bold text-[var(--color-navy)]">
              Total Upgrades
            </span>
            <span className="text-base font-bold text-[var(--color-navy)]">
              {total === 0 ? "$0" : formatPrice(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
