import { categories } from "./options-data";

export function calculateTotal(selections: Record<string, string>): number {
  let total = 0;
  for (const category of categories) {
    for (const sub of category.subCategories) {
      const selectedId = selections[sub.id];
      if (selectedId) {
        const option = sub.options.find((o) => o.id === selectedId);
        if (option) total += option.price;
      }
    }
  }
  return total;
}

export function formatPrice(price: number): string {
  if (price === 0) return "Included";
  return `+$${price.toLocaleString()}`;
}
