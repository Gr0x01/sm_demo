"use client";

import type { StepConfig } from "@/lib/step-config";

interface StepNavProps {
  steps: StepConfig[];
  activeStepId: string;
  completionMap: Record<string, boolean>;
  onSelectStep: (stepId: string) => void;
}

export function StepNav({ steps, activeStepId, completionMap, onSelectStep }: StepNavProps) {
  const activeStep = steps.find((s) => s.id === activeStepId);

  return (
    <div className="py-2">
      {/* Desktop: full rail with labels */}
      <div className="hidden sm:flex items-center justify-center gap-0">
        {steps.map((step, i) => {
          const isActive = step.id === activeStepId;
          const isComplete = completionMap[step.id] && !isActive;

          return (
            <div key={step.id} className="flex items-center">
              {/* Connector line (before each step except first) */}
              {i > 0 && (
                <div
                  className={`w-10 h-0.5 ${
                    isComplete || isActive ? "bg-[var(--color-navy)]" : "bg-gray-200"
                  }`}
                />
              )}

              {/* Step circle + label */}
              <button
                onClick={() => onSelectStep(step.id)}
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? "bg-[var(--color-navy)] text-white shadow-md"
                      : isComplete
                      ? "bg-green-500 text-white"
                      : "border-2 border-gray-300 text-gray-400 group-hover:border-gray-400 group-hover:text-gray-500"
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium leading-tight text-center max-w-[5rem] ${
                    isActive ? "text-[var(--color-navy)]" : "text-gray-400"
                  }`}
                >
                  {step.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile: compact nav with dots + label */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-2 mb-1">
          {steps.map((step) => {
            const isActive = step.id === activeStepId;
            const isComplete = completionMap[step.id] && !isActive;

            return (
              <button
                key={step.id}
                onClick={() => onSelectStep(step.id)}
                className="cursor-pointer"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 ${
                    isActive
                      ? "bg-[var(--color-navy)] text-white shadow-md"
                      : isComplete
                      ? "bg-green-500 text-white"
                      : "border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {activeStep && (
          <p className="text-center text-[11px] text-gray-500">
            Step {activeStep.number} of {steps.length} — {activeStep.name}
          </p>
        )}
      </div>
    </div>
  );
}
