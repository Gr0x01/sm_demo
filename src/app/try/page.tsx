import type { Metadata } from "next";
import { getCategoriesWithOptions } from "@/lib/db-queries";
import { DEMO_ORG_ID } from "@/lib/demo-generate";
import { DemoClient } from "./DemoClient";
import type { SubCategory } from "@/types";

/** Subcategory slugs shown on the /try kitchen demo. */
const TRY_SUBCATEGORY_SLUGS = new Set([
  "backsplash",
  "counter-top",
  "kitchen-cabinet-color",
  "kitchen-island-cabinet-color",
]);

export const metadata: Metadata = {
  title: { absolute: "Try Finch — Interactive Upgrade Visualization Demo" },
  description:
    "Pick kitchen finishes and see the room update instantly. This is what your buyers experience with Finch.",
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

export default async function DemoPage() {
  const allCategories = await getCategoriesWithOptions(DEMO_ORG_ID);

  // Filter to the 4 kitchen subcategories, flattened across categories
  const demoSubCategories: SubCategory[] = allCategories
    .flatMap((cat) => cat.subCategories)
    .filter((sub) => TRY_SUBCATEGORY_SLUGS.has(sub.id));

  // Build valid ID sets for client-side validation
  const validSubCategoryIds = demoSubCategories.map((s) => s.id);
  const validOptionIds = demoSubCategories.flatMap((s) => s.options.map((o) => o.id));

  return (
    <DemoClient
      subCategories={demoSubCategories}
      validSubCategoryIds={validSubCategoryIds}
      validOptionIds={validOptionIds}
    />
  );
}
