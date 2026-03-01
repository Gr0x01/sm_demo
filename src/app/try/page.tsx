import type { Metadata } from "next";
import { DemoClient } from "./DemoClient";

export const metadata: Metadata = {
  title: { absolute: "Try Finch — Interactive Upgrade Visualization Demo" },
  description:
    "Pick finishes and see the room update instantly. This is what your buyers experience with Finch.",
  alternates: { canonical: "https://withfin.ch/try" },
  openGraph: {
    title: "Try Finch — Interactive Upgrade Visualization Demo",
    description:
      "Pick finishes and see the room update instantly. This is what your buyers experience with Finch.",
    url: "https://withfin.ch/try",
    siteName: "Finch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Try Finch — Interactive Upgrade Visualization Demo",
    description:
      "Pick finishes and see the room update instantly.",
  },
};

export default function DemoPage() {
  return <DemoClient />;
}
