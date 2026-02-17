"use client";

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  hasChanges: boolean;
}

export function GenerateButton({
  onClick,
  isGenerating,
  hasChanges,
}: GenerateButtonProps) {
  const disabled = isGenerating || !hasChanges;

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
      {isGenerating ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Generating Your Kitchen...
        </span>
      ) : hasChanges ? (
        "Visualize My Kitchen"
      ) : (
        "Up to Date"
      )}
    </button>
  );
}
