import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Page Not Found — Finch",
};

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-8xl font-semibold text-slate-200 leading-none">
            404
          </p>
          <p className="mt-4 text-sm uppercase tracking-[0.16em] text-slate-500">
            This room doesn&apos;t exist yet
          </p>
          <p className="mt-3 text-sm text-slate-400">
            The page you&apos;re looking for may have moved or never existed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/try"
              className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try the Demo
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
