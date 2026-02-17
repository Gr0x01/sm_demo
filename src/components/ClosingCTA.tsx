"use client";

export function ClosingCTA({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-navy)] px-6 text-white">
      <div className="max-w-xl text-center">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-[var(--color-gold)] mb-4">
          Stone Martin Builders
        </h2>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          Want this for{" "}
          <span className="text-[var(--color-gold)]">your buyers?</span>
        </h1>
        <p className="text-lg text-gray-300 leading-relaxed mb-10">
          AI-powered upgrade visualization. Real pricing. Social proof that
          drives upsell. Built for the way people actually buy homes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:hello@example.com"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--color-gold)] text-[var(--color-navy)] text-lg font-semibold rounded-lg hover:bg-[var(--color-gold-light)] transition-colors"
          >
            Let&apos;s Talk
          </a>
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white text-lg font-semibold rounded-lg hover:border-white/60 transition-colors cursor-pointer"
          >
            Back to Demo
          </button>
        </div>
      </div>
    </div>
  );
}
