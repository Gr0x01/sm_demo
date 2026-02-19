"use client";

import { useState } from "react";
import Link from "next/link";

interface NavLink {
  label: string;
  href: string;
}

interface SiteNavProps {
  /** Navigation links — section anchors on homepage, page links on other pages */
  links?: NavLink[];
  /** CTA button config */
  cta?: { label: string; href: string };
}

const DEFAULT_CTA = {
  label: "Book a Demo",
  href: "mailto:hello@finchweb.io?subject=Finch Demo",
};

export function SiteNav({ links = [], cta = DEFAULT_CTA }: SiteNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/" className="text-base font-semibold text-slate-900 tracking-[0.04em]">
          Finch
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-[0.16em] text-slate-500 hover:text-slate-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href={cta.href}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            {cta.label}
          </a>
        </div>
        {(links.length > 0) && (
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8"
            aria-label="Toggle menu"
          >
            <span className={`block h-px w-5 bg-slate-700 transition-all ${mobileOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
            <span className={`block h-px w-5 bg-slate-700 transition-all ${mobileOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
          </button>
        )}
      </div>
      {links.length > 0 && (
        <div className={`md:hidden grid transition-[grid-template-rows] duration-200 ease-out ${mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div className="border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-xs uppercase tracking-[0.16em] text-slate-500"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={cta.href}
                className="text-center px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider"
              >
                {cta.label}
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
