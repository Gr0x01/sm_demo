import type { Category } from "@/types";

export function calculateTotal(
  selections: Record<string, string>,
  quantities: Record<string, number> = {},
  categories: Category[]
): number {
  let total = 0;
  for (const category of categories) {
    for (const sub of category.subCategories) {
      const selectedId = selections[sub.id];
      if (selectedId) {
        const option = sub.options.find((o) => o.id === selectedId);
        if (option) {
          const qty = sub.isAdditive ? (quantities[sub.id] || 0) : 1;
          total += option.price * qty;
        }
      }
    }
  }
  return total;
}

export function formatPrice(price: number): string {
  if (price === 0) return "Included";
  return `+$${price.toLocaleString()}`;
}
