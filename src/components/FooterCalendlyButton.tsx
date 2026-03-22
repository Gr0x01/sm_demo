"use client";

import { CalendlyPopupButton } from "@/app/landing-client";

export function FooterCalendlyButton() {
  return (
    <CalendlyPopupButton
      className="inline-block mt-5 px-4 py-2 border border-slate-600 text-xs uppercase tracking-[0.12em] text-slate-300 hover:border-white hover:text-white transition-colors cursor-pointer"
      location="footer"
    >
      Book a Call
    </CalendlyPopupButton>
  );
}
