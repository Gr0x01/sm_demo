import { FooterCalendlyButton } from "./FooterCalendlyButton";

const PRODUCT_LINKS = [
  { label: "Try It", href: "/try" },
  { label: "Get Started", href: "/#get-started" },
];

const LEARN_LINKS = [
  { label: "Upgrade Guide", href: "/learn" },
  { label: "Pulte Design Center", href: "/learn/design-center/pulte" },
  { label: "Arbor Design Center", href: "/learn/design-center/arbor" },
];

const RESEARCH_LINKS = [
  { label: "Upgrade Revenue", href: "/research/hidden-revenue-line" },
  { label: "Visualization Lift", href: "/research/visualization-lift" },
];

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 font-semibold mb-3">
        {title}
      </p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-6 py-14 bg-[var(--color-dark)]">
      <div className="max-w-6xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 md:gap-12">
          {/* Brand column */}
          <div>
            <a
              href="/"
              className="text-base font-semibold tracking-[0.16em] uppercase text-white hover:text-slate-300 transition-colors"
            >
              Finch
            </a>
            <p className="text-sm text-slate-400 mt-2 max-w-[16rem]">
              Your buyers upgrade what they can see.
            </p>
            <FooterCalendlyButton />
            <div className="mt-4">
              <a
                href="https://www.linkedin.com/company/112412489/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-white transition-colors"
                aria-label="Finch on LinkedIn"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns — 3-col grid on mobile, dissolve into parent grid on md+ */}
          <div className="grid grid-cols-3 gap-6 md:contents">
            <LinkColumn title="Product" links={PRODUCT_LINKS} />
            <LinkColumn title="Learn" links={LEARN_LINKS} />
            <LinkColumn title="Research" links={RESEARCH_LINKS} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Finch. All rights reserved.
          </p>
          <a
            href="mailto:hello@withfin.ch"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            hello@withfin.ch
          </a>
        </div>
      </div>
    </footer>
  );
}
