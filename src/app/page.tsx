import type { Metadata } from "next";
import LandingPage from "./landing-full";

export const metadata: Metadata = {
  title: { absolute: "Finch — Upgrade Visualization for Home Builders" },
  description:
    "Home builders who use Finch sell more upgrades per home. First floor plan live in 48 hours. No software to learn.",
  alternates: { canonical: "https://withfin.ch/" },
  openGraph: {
    title: "Finch — Upgrade Visualization for Home Builders",
    description:
      "Home builders who use Finch sell more upgrades per home. First floor plan live in 48 hours.",
    url: "https://withfin.ch/",
    siteName: "Finch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finch — Upgrade Visualization for Home Builders",
    description:
      "Home builders who use Finch sell more upgrades per home. First floor plan live in 48 hours.",
  },
};

export default function Page() {
  return <LandingPage />;
}
