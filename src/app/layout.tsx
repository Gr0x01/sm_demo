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
  url: "https://withfin.ch",
  logo: "https://withfin.ch/finch-logo.png",
  email: "hello@withfin.ch",
  description:
    "Upgrade visualization for home builders. Buyers pick finishes and see the room change.",
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
