import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stone Martin Builders — Upgrade Picker",
  description: "Visualize your dream kitchen with AI-powered upgrade selection",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
