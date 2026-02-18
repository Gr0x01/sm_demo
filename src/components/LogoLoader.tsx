"use client";

const ANIM = "logoShapePulse 1.8s ease-in-out infinite";

export function LogoLoader({ className = "" }: { className?: string }) {
  return (
    <>
      <style>{`
        @keyframes logoShapePulse {
          0%, 10%  { opacity: 0.15 }
          20%, 40% { opacity: 1 }
          60%, 100% { opacity: 0.15 }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="49.33319"
        height="25.95427"
        viewBox="0 0 49.33319 25.95427"
        className={className}
      >
        {/* Diamond */}
        <path
          d="M12.97714,0L0,12.97714l12.97714,12.97714l12.97714-12.97714L12.97714,0z M7.79297,12.97714l5.15072-5.15072 l5.15072,5.15072l-5.15072,5.15072L7.79297,12.97714z"
          fill="currentColor"
          style={{ opacity: 0.15, animation: ANIM }}
        />
        {/* First chevron */}
        <path
          d="M37.59356,12.97714L24.64987,25.92083l-3.91321-3.87976l3.91321-3.91321l5.15072-5.15072l-9.06393-9.06393L24.64987,0 C24.64987,0,37.59356,12.97714,37.59356,12.97714z"
          fill="currentColor"
          style={{ opacity: 0.15, animation: ANIM, animationDelay: "0.3s" }}
        />
        {/* Second chevron */}
        <polygon
          points="49.33319,12.97714 36.35605,25.92083 32.47629,22.04107 36.35605,18.12786 41.54022,12.97714 32.47629,3.91321 36.35605,0"
          fill="currentColor"
          style={{ opacity: 0.15, animation: ANIM, animationDelay: "0.6s" }}
        />
      </svg>
    </>
  );
}
