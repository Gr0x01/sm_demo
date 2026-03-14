import { describe, it, expect } from "vitest";
import { calculateTotal, formatPrice } from "./pricing";
import type { Category } from "@/types";

const categories: Category[] = [
  {
    id: "cat-1",
    name: "Kitchen",
    subCategories: [
      {
        id: "cabinets",
        name: "Cabinets",
        categoryId: "cat-1",
        isVisual: true,
        options: [
          { id: "cab-white", name: "White", price: 0 },
          { id: "cab-espresso", name: "Espresso", price: 2500 },
        ],
      },
      {
        id: "countertops",
        name: "Countertops",
        categoryId: "cat-1",
        isVisual: true,
        options: [
          { id: "ct-laminate", name: "Laminate", price: 0 },
          { id: "ct-granite", name: "Granite", price: 1800 },
        ],
      },
      {
        id: "outlets",
        name: "Extra Outlets",
        categoryId: "cat-1",
        isVisual: false,
        isAdditive: true,
        options: [
          { id: "outlet-standard", name: "Standard Outlet", price: 150 },
        ],
      },
    ],
  },
];

describe("calculateTotal", () => {
  it("sums prices for selected options", () => {
    const total = calculateTotal(
      { cabinets: "cab-espresso", countertops: "ct-granite" },
      {},
      categories,
    );
    expect(total).toBe(4300);
  });

  it("returns 0 when no selections match", () => {
    expect(calculateTotal({}, {}, categories)).toBe(0);
  });

  it("returns 0 for selections with included (free) options", () => {
    const total = calculateTotal(
      { cabinets: "cab-white", countertops: "ct-laminate" },
      {},
      categories,
    );
    expect(total).toBe(0);
  });

  it("multiplies by quantity for additive subcategories", () => {
    const total = calculateTotal(
      { outlets: "outlet-standard" },
      { outlets: 3 },
      categories,
    );
    expect(total).toBe(450);
  });

  it("treats non-additive subcategories as quantity 1", () => {
    const total = calculateTotal(
      { cabinets: "cab-espresso" },
      { cabinets: 5 }, // quantity ignored for non-additive
      categories,
    );
    expect(total).toBe(2500);
  });

  it("ignores selections with unknown option IDs", () => {
    const total = calculateTotal(
      { cabinets: "nonexistent-option" },
      {},
      categories,
    );
    expect(total).toBe(0);
  });

  it("handles additive with zero quantity", () => {
    const total = calculateTotal(
      { outlets: "outlet-standard" },
      { outlets: 0 },
      categories,
    );
    expect(total).toBe(0);
  });
});

describe("formatPrice", () => {
  it("returns 'Included' for $0", () => {
    expect(formatPrice(0)).toBe("Included");
  });

  it("formats positive prices with +$ prefix", () => {
    expect(formatPrice(2500)).toBe("+$2,500");
  });

  it("formats small prices without comma", () => {
    expect(formatPrice(150)).toBe("+$150");
  });
});
