import type { Metadata } from "next";
import { DemoClient } from "./DemoClient";

export const metadata: Metadata = {
  title: "Try Finch — AI Kitchen Visualization Demo",
  description:
    "Upload a photo of your kitchen, pick materials, and see AI-generated visualizations in seconds. This is what your buyers experience with Finch.",
};

export default function DemoPage() {
  return <DemoClient />;
}
