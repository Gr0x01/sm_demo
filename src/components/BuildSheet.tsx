"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/pricing";
import { shiftHex } from "@/lib/color";
import type { UpgradeGroup } from "@/lib/upgrade-groups";
import type { StepConfig } from "@/lib/step-config";
import { Printer } from "lucide-react";

interface GeneratedImage {
  stepPhotoId: string | null;
  stepSlug: string;
  imagePath: string;
  imageUrl: string;
}

export interface BuildSheetProps {
  upgradeGroups: UpgradeGroup[];
  total: number;
  planName: string;
  community: string;
  orgName: string;
  logoUrl: string | null;
  buyerEmail: string | null;
  steps: StepConfig[];
  generatedImages: GeneratedImage[];
  orgTheme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function BuildSheet({
  upgradeGroups,
  total,
  planName,
  community,
  orgName,
  logoUrl,
  buyerEmail,
  steps,
  generatedImages,
  orgTheme,
}: BuildSheetProps) {
  const [showImages, setShowImages] = useState(true);
  const [copied, setCopied] = useState(false);

  const themeVars = useMemo(
    () =>
      ({
        "--color-navy": orgTheme.primaryColor,
        "--color-navy-hover": shiftHex(orgTheme.primaryColor, -0.15),
        "--color-accent": orgTheme.accentColor,
        "--color-secondary": orgTheme.secondaryColor,
      }) as React.CSSProperties,
    [orgTheme]
  );

  // Group generated images by step slug
  const imagesByStep = useMemo(() => {
    const map = new Map<string, GeneratedImage[]>();
    for (const img of generatedImages) {
      const list = map.get(img.stepSlug) ?? [];
      list.push(img);
      map.set(img.stepSlug, list);
    }
    return map;
  }, [generatedImages]);

  // Steps that have hero images (legacy SM path)
  const roomImages = useMemo(
    () =>
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: noop
    }
  };

  const hasAnyImages = generatedImages.length > 0 || roomImages.length > 0;

  return (
    <div className="min-h-screen bg-white print:bg-white" style={themeVars}>
      {/* Nav bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 print:static print:bg-white print:backdrop-blur-none">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt={orgName} className="h-5" />
            )}
          </div>
          <div className="flex items-center gap-5 no-print">
            {hasAnyImages && (
              <button
                onClick={() => setShowImages((v) => !v)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className={`w-8 h-5 flex items-center transition-colors ${showImages ? "bg-[var(--color-navy)]" : "bg-slate-300"}`}>
                  <span className={`w-3.5 h-3.5 bg-white block transition-transform ${showImages ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
                <span className="text-xs font-medium text-gray-500">Images</span>
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-600 hover:text-[var(--color-navy)] hover:border-gray-300 transition-colors cursor-pointer"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-navy)] text-white text-xs font-semibold hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-[var(--color-navy)]">
            Build Sheet
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {planName}{community ? ` \u00B7 ${community}` : ""}
          </p>
        </div>

        {/* Buyer info */}
        {buyerEmail && (
          <p className="text-sm text-gray-500 mb-6">
            Prepared for{" "}
            <span className="font-medium text-[var(--color-navy)]">
              {buyerEmail}
            </span>
          </p>
        )}

        {/* Room / generated images */}
        {showImages && (
          <>
            {/* Per-step generated images (multi-tenant path) */}
            {generatedImages.length > 0 && (
              <div className="mb-8 space-y-4">
                {steps
                  .filter((s) => imagesByStep.has(s.id))
                  .map((step) => (
                    <div key={step.id}>
                      <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">
                        {step.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {imagesByStep.get(step.id)!.map((img) => (
                          <div
                            key={img.imagePath}
                            className="relative overflow-hidden"
                          >
                            <img
                              src={img.imageUrl}
                              alt={step.name}
                              className="w-full aspect-[16/10] object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Legacy hero images (SM path) — only if no generated images */}
            {generatedImages.length === 0 && roomImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-8">
                {roomImages.map((room) => (
                  <div key={room.stepId} className="relative overflow-hidden">
                    <img
                      src={room.src}
                      alt={room.label}
                      className="w-full aspect-[16/10] object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

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

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>
            Generated by {orgName} &middot; Powered by{" "}
            <span className="font-medium tracking-[0.12em] uppercase">Finch</span>
          </p>
        </div>
      </div>
    </div>
  );
}
