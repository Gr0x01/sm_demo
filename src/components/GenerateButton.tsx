"use client";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  hasChanges: boolean;
  stepName?: string;
}

export function GenerateButton({
  onClick,
  isGenerating,
  hasChanges,
  stepName,
}: GenerateButtonProps) {
  const disabled = isGenerating || !hasChanges;
  const label = stepName || "Room";
  const labels = {
    action: `Visualize My ${label}`,
    generating: `Visualizing Your ${label}...`,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-6 font-semibold text-sm transition-all duration-150 cursor-pointer ${
        disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)] shadow-md hover:shadow-lg active:scale-[0.98]"
      }`}
    >
      {isGenerating ? labels.generating : hasChanges ? labels.action : "Up to Date"}
    </button>
  );
}
