import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finch — Upgrade Visualization for Home Builders",
  description: "AI-powered upgrade visualization that helps home builders close more upgrades",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
