"use client";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  hasChanges: boolean;
  stepId?: string;
}

const stepLabels: Record<string, { action: string; generating: string }> = {
  "set-your-style": { action: "Visualize My Style", generating: "Visualizing Your Style..." },
  "design-your-kitchen": { action: "Visualize My Kitchen", generating: "Visualizing Your Kitchen..." },
  "primary-bath": { action: "Visualize My Bathroom", generating: "Visualizing Your Bathroom..." },
  "secondary-spaces": { action: "Visualize My Spaces", generating: "Visualizing Your Spaces..." },
};

export function GenerateButton({
  onClick,
  isGenerating,
  hasChanges,
  stepId,
}: GenerateButtonProps) {
  const disabled = isGenerating || !hasChanges;
  const labels = stepId && stepLabels[stepId]
    ? stepLabels[stepId]
    : { action: "Visualize My Room", generating: "Visualizing..." };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-6 font-semibold text-sm transition-all duration-150 cursor-pointer ${
        disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-[var(--color-navy)] text-white hover:bg-[#243a5e] shadow-md hover:shadow-lg active:scale-[0.98]"
      }`}
    >
      {isGenerating ? labels.generating : hasChanges ? labels.action : "Up to Date"}
    </button>
  );
}
