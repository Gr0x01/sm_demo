"use client";

import type { SubCategory } from "@/types";
import type { StepConfig } from "@/lib/step-config";
import { RoomSection } from "./RoomSection";

interface StepContentProps {
  step: StepConfig;
  subCategoryMap: Map<string, SubCategory>;
  selections: Record<string, string>;
  quantities: Record<string, number>;
  onSelect: (subCategoryId: string, optionId: string) => void;
  onSetQuantity: (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => void;
}

export function StepContent({
  step,
  subCategoryMap,
  selections,
  quantities,
  onSelect,
  onSetQuantity,
}: StepContentProps) {
  return (
    <div key={step.id} className="space-y-8 mt-5 animate-fade-slide-in">
      {step.sections.map((section) => {
        const subCategories = section.subCategoryIds
          .map((id) => subCategoryMap.get(id))
          .filter((sub): sub is SubCategory => sub !== undefined);

        if (subCategories.length === 0) return null;

        const sectionId = `section-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        return (
          <div
            key={section.title}
            id={sectionId}
            data-section-title={section.title}
            style={{ scrollMarginTop: "var(--header-height, 120px)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                {section.title}
              </h3>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <RoomSection
              subCategories={subCategories}
              selections={selections}
              quantities={quantities}
              onSelect={onSelect}
              onSetQuantity={onSetQuantity}
            />
          </div>
        );
      })}
    </div>
  );
}
