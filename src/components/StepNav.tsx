"use client";

import type { StepConfig } from "@/lib/step-config";

interface StepNavProps {
  steps: StepConfig[];
  activeStepId: string;
  completionMap: Record<string, boolean>;
  onSelectStep: (stepId: string) => void;
}

export function StepNav({ steps, activeStepId, completionMap, onSelectStep }: StepNavProps) {
  return (
    <div className="py-2">
      {/* Desktop: full rail with labels */}
      <div className="hidden sm:block">
        <div className="relative flex justify-center">
          {/* Connector lines — behind the circles */}
          <div className="absolute top-4 flex items-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
            {steps.slice(0, -1).map((step, i) => {
              const activeIndex = steps.findIndex((s) => s.id === activeStepId);
              const isPast = i < activeIndex;
              return (
                <div key={step.id} className="flex items-center">
                  {i > 0 && <div className="w-8 shrink-0" />}
                  <div
                    className={`w-24 h-0.5 transition-colors duration-300 ${
                      isPast ? "bg-[var(--color-navy)]" : "bg-gray-200"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Step columns — circle + label stacked */}
          {steps.map((step, i) => {
            const isActive = step.id === activeStepId;
            const activeIndex = steps.findIndex((s) => s.id === activeStepId);
            const isComplete = completionMap[step.id] && !isActive;

            return (
              <button
                key={step.id}
                onClick={() => onSelectStep(step.id)}
                className={`relative z-10 flex flex-col items-center cursor-pointer group w-32 ${
                  i > 0 ? "" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-[var(--color-navy)] text-white shadow-md scale-110"
                      : isComplete
                      ? "bg-green-500 text-white"
                      : "bg-white border-2 border-gray-300 text-gray-400 group-hover:border-gray-400 group-hover:text-gray-500"
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
                  className={`mt-1.5 text-[11px] font-medium leading-tight text-center transition-colors duration-300 ${
                    isActive ? "text-[var(--color-navy)]" : "text-gray-400"
                  }`}
                >
                  {step.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: compact nav with dots */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center gap-2">
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
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
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
                    step.number
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
