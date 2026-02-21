"use client";

import type { StepConfig } from "@/lib/step-config";

interface StepNavProps {
  steps: StepConfig[];
  activeStepId: string;
  completionMap: Record<string, boolean>;
  onSelectStep: (stepId: string) => void;
}

export function StepNav({ steps, activeStepId, completionMap, onSelectStep }: StepNavProps) {
  const activeIndex = steps.findIndex((s) => s.id === activeStepId);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="py-2 w-full">
      {/* Desktop/tablet: evenly spaced steps with connector rail */}
      <div className="hidden sm:flex sm:justify-center sm:gap-2 lg:gap-0 lg:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((step, i) => {
          const isActive = step.id === activeStepId;
          const isComplete = completionMap[step.id] && !isActive;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className="relative z-10 flex flex-col items-center cursor-pointer group"
            >
              {/* Connector lines — extend left and right from circle center */}
              {i > 0 && (
                <div
                  className={`absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2 transition-colors duration-300 hidden lg:block ${
                    i <= safeActiveIndex ? "bg-[var(--color-navy)]" : "bg-slate-200"
                  }`}
                />
              )}
              {i < steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2 transition-colors duration-300 hidden lg:block ${
                    i < safeActiveIndex ? "bg-[var(--color-navy)]" : "bg-slate-200"
                  }`}
                />
              )}
              <div
                className={`relative w-8 h-8 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-[var(--color-navy)] text-white shadow-md scale-110"
                    : isComplete
                    ? "bg-green-500 text-white"
                    : "bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-500"
                }`}
              >
                {isComplete ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-medium leading-tight text-center transition-colors duration-300 hidden lg:block ${
                  isActive ? "text-[var(--color-navy)]" : "text-slate-400"
                }`}
              >
                {step.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: compact nav with dots */}
      <div className="sm:hidden w-full">
        <div className="overflow-x-auto">
          <div className="mx-auto flex w-max items-center gap-2 px-1 pb-1">
            {steps.map((step, i) => {
              const isActive = step.id === activeStepId;
              const isComplete = completionMap[step.id] && !isActive;

              return (
                <button
                  key={step.id}
                  onClick={() => onSelectStep(step.id)}
                  className="cursor-pointer"
                  aria-label={`Go to step ${i + 1}: ${step.name}`}
                >
                  <div
                    className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      isActive
                        ? "bg-[var(--color-navy)] text-white shadow-md scale-110"
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
                      i + 1
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
