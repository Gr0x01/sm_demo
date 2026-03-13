import { PilotForm } from "@/app/landing-client";

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
              Send us your option sheets.
              <br />
              We handle everything&nbsp;else.
            </>
          )}
        </h2>
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          {subtitle ?? (<>Pick your best-selling community. We build the experience using your finishes, your pricing, your model home photos. Buyers use it during real appointments. We measure upgrade revenue&nbsp;together.</>)}
        </p>
      </div>

      <div className="max-w-3xl mx-auto border border-slate-200 bg-white p-6 md:p-8">
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8">
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              48 hours to live
            </p>
            <p className="text-sm text-slate-600">
              Send us your option sheets and model home photos. We build it. You don&apos;t touch a&nbsp;thing.
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
              We set it up, your buyers use it, we measure upgrade revenue together. Expand when the numbers make&nbsp;sense.
            </p>
          </div>
        </div>

        <PilotForm />
      </div>

      <p className="text-sm text-slate-500 text-center mt-6 max-w-3xl mx-auto">
        No upfront cost. After you&apos;ve seen the results, we scope
        pricing to your community count. We&apos;ll walk through it&nbsp;together.
      </p>
    </section>
  );
}

/** @deprecated Use GetStartedSection */
export const PilotSection = GetStartedSection;
