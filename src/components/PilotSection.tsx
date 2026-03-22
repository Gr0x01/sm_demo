import { CalendlyPopupButton, PilotForm } from "@/app/landing-client";

export function GetStartedSection({
  headline,
  subtitle,
}: {
  headline?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <section id="get-started" className="px-6 py-20 md:py-28 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
          Start Here
        </p>
        <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-6 text-balance">
          {headline ?? (
            <>
              Fifteen minutes on
              <br />
              a real&nbsp;floorplan.
            </>
          )}
        </h2>
        <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          {subtitle ?? (
            <>
              We&apos;ll walk through the full buyer experience together:
              selections, visualization, price tracking. You&apos;ll know if it
              fits before the call&nbsp;ends.
            </>
          )}
        </p>

        {/* Primary CTA */}
        <CalendlyPopupButton className="inline-block px-10 py-4 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer">
          Book a 15-Minute Walkthrough
        </CalendlyPopupButton>

        <p className="text-sm text-slate-500 mt-4">
          No upfront cost. No commitment. Just your floor&nbsp;plans.
        </p>
      </div>

      {/* Value props */}
      <div className="max-w-3xl mx-auto mt-16">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-10">
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Live in days, not months
            </p>
            <p className="text-sm text-slate-600">
              We handle setup using your option sheets and model home photos. You don&apos;t touch a&nbsp;thing.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Nothing changes for your team
            </p>
            <p className="text-sm text-slate-600">
              Same design appointments, same workflow. Buyers use it themselves. Your team gets a priced selection&nbsp;sheet.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Start with one community
            </p>
            <p className="text-sm text-slate-600">
              Your buyers use it, we measure upgrade revenue together. Expand when the numbers make&nbsp;sense.
            </p>
          </div>
        </div>

        {/* Secondary: lightweight form */}
        <div className="border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500 mb-4 text-center">
            Not ready to book? Leave your info and we&apos;ll reach&nbsp;out.
          </p>
          <PilotForm />
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use GetStartedSection */
export const PilotSection = GetStartedSection;
