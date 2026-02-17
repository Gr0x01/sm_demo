"use client";

export function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-[var(--color-accent)] mb-4">
            Stone Martin Builders
          </h2>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-[var(--color-navy)] mb-6">
            Your buyers choose $40K+ in upgrades from a{" "}
            <span className="text-[var(--color-accent)]">printed sheet.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            No visuals. No price feedback. No upsell intelligence.
            <br />
            What if they could <em>see</em> their choices come to life?
          </p>
        </div>

        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-navy)] text-white text-lg font-semibold hover:bg-[#243358] transition-all duration-150 shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
        >
          See It In Action
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <p className="mt-6 text-sm text-gray-400">
          Real Kinkade plan pricing &bull; AI-powered kitchen visualization
        </p>
      </div>
    </div>
  );
}
