import {
  parseModifiersPayload,
  type ModifiersPayload,
} from '@/lib/data/product-modifiers';
import { replaceOrderLines } from '@/lib/firebase/orders';

export type OrderCartLine = {
  productId: number;
  quantity: number;
  unitPrice: number;
  displayName: string;
  modifiers: ModifiersPayload;
};

export function cloneOrderCartLines(lines: OrderCartLine[]): OrderCartLine[] {
  return lines.map((l) => ({
    ...l,
    modifiers: structuredClone(l.modifiers),
  }));
}

export function orderCartSnapshot(lines: OrderCartLine[]): string {
  const normalized = lines
    .map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      displayName: l.displayName,
      modifiers: l.modifiers,
    }))
    .sort((a, b) => {
      const byProduct = a.productId - b.productId;
      if (byProduct !== 0) return byProduct;
      return a.displayName.localeCompare(b.displayName);
    });
  return JSON.stringify(normalized);
}

export function orderCartLinesEqual(a: OrderCartLine[], b: OrderCartLine[]): boolean {
  return orderCartSnapshot(a) === orderCartSnapshot(b);
}

export type ApiOrderLine = {
  product_id: number;
  quantity: number;
  unit_price: number;
  display_name?: string | null;
  product_name?: string | null;
  modifiers_json?: string | null;
};

export function parseLineModifiers(raw: string | null | undefined): ModifiersPayload {
  try {
    return parseModifiersPayload(JSON.parse(raw || '[]'));
  } catch {
    return parseModifiersPayload(raw);
  }
}

export function apiLinesToSyncLines(lines: ApiOrderLine[]): OrderCartLine[] {
  return lines.map((line) => ({
    productId: line.product_id,
    quantity: line.quantity,
    unitPrice: line.unit_price,
    displayName: line.display_name?.trim() || line.product_name?.trim() || '',
    modifiers: parseLineModifiers(line.modifiers_json),
  }));
}

export async function syncOrderCartLines(
  orderId: number,
  lines: OrderCartLine[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await replaceOrderLines(
      orderId,
      lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        displayName: l.displayName,
        modifiers: l.modifiers,
      }))
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Error al guardar' };
  }
}
