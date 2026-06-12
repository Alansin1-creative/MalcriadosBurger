import type { MenuCombo } from '@/lib/data/combos';
import type { OrderCartLine } from '@/lib/order-cart';

export type CatalogProduct = {
  id: number;
  name: string;
  price: number;
  category: string;
};

export function resolveComboLines(
  combo: MenuCombo,
  catalog: CatalogProduct[]
): { lines: OrderCartLine[]; missing: string[] } {
  const byName = new Map(catalog.map((p) => [p.name, p]));
  const lines: OrderCartLine[] = [];
  const missing: string[] = [];

  for (const item of combo.items) {
    const product = byName.get(item.productName);
    if (!product) {
      missing.push(item.productName);
      continue;
    }
    lines.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.price,
      displayName: product.name,
      modifiers: { extras: [] },
    });
  }

  return { lines, missing };
}

export function comboEstimatedTotal(combo: MenuCombo, catalog: CatalogProduct[]): number {
  const byName = new Map(catalog.map((p) => [p.name, p]));
  return combo.items.reduce((sum, item) => {
    const product = byName.get(item.productName);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}
