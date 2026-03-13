const LINKS = [
  { label: "Try It", href: "/try" },
  { label: "Get Started", href: "/#get-started" },
  { label: "Research", href: "/research/hidden-revenue-line" },
  { label: "Contact", href: "mailto:hello@withfin.ch" },
];

export function SiteFooter() {
  return (
    <footer className="px-6 py-10 border-t border-slate-100 bg-slate-50">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <a href="/" className="text-sm font-semibold text-slate-900 tracking-[0.04em] hover:text-slate-700 transition-colors">
          Finch
        </a>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Finch. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
