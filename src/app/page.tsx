"use client";

import { SiteNav } from "@/components/SiteNav";
import { DemoClient } from "./try/DemoClient";

const introContent = (
  <div className="pb-4 md:pb-5">
    <h1 className="text-2xl md:text-[1.7rem] leading-[1.15] tracking-[-0.01em] text-slate-900 mb-4">
      I love design. I love building products. Finch is where they&nbsp;meet.
    </h1>
    <div className="text-sm text-slate-600 leading-relaxed space-y-3">
      <p>
        My wife and I were choosing upgrades and I kept thinking, what if
        you could just see it? So I built a tool that generates a photo of
        your kitchen with the finishes you pick.
      </p>
      <p>
        There&apos;s a sample kitchen below. Pick some options and hit
        generate, or drop in your own photo.
      </p>
      <p className="text-xs text-slate-400 pt-1">
        Questions?{" "}
        <a
          href="mailto:hello@withfin.ch"
          className="text-slate-500 hover:text-slate-900 border-b border-slate-300 hover:border-slate-900 transition-colors"
        >
          hello@withfin.ch
        </a>
      </p>
    </div>
  </div>
);

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteNav links={[]} cta={null} />
      <DemoClient bare autoSample headerContent={introContent} />
    </div>
  );
}
