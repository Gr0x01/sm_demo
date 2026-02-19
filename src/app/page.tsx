import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-6xl font-bold tracking-tight">Finch</h1>
      <p className="text-xl text-zinc-400 max-w-md text-center">
        AI-powered upgrade visualization for home builders
      </p>
      <p className="text-sm text-zinc-600 uppercase tracking-widest">Coming soon</p>
      <Link
        href="/stone-martin/kinkade"
        className="mt-8 px-6 py-3 bg-white text-black text-sm font-medium uppercase tracking-wider hover:bg-zinc-200 transition-colors"
      >
        View Demo
      </Link>
    </div>
  );
}
