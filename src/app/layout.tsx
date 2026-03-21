import type { Metadata } from "next";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://withfin.ch"),
  title: {
    default: "Finch",
    template: "%s | Finch",
  },
  description: "Upgrade visualization for home builders.",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Finch",
  alternateName: "Finch Upgrade Visualization",
  url: "https://withfin.ch",
  logo: "https://withfin.ch/finch-logo.png",
  email: "hello@withfin.ch",
  description:
    "Design center software for production home builders. Buyers pick finishes and see photorealistic images of their actual room with selections applied. Replaces PDF option sheets and static design center displays.",
  knowsAbout: [
    "home builder upgrade visualization",
    "design center software",
    "new construction upgrades",
    "builder options and upgrades",
    "upgrade revenue optimization",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PostHogProvider>{children}</PostHogProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
