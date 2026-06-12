import { RESTAURANT } from '@/lib/data/malcriados-menu';
import type { Order, OrderLine } from '@/lib/types';

export interface SalesReceiptLine {
  quantity: number;
  name: string;
  unitPrice: number;
  lineTotal: number;
}

export interface SalesReceipt {
  orderId: number;
  restaurantName: string;
  tagline: string;
  tableName: string | null;
  paidAt: string;
  lines: SalesReceiptLine[];
  subtotal: number;
  tax: number;
  total: number;
}

export function buildSalesReceipt(order: Order, lines: OrderLine[]): SalesReceipt {
  return {
    orderId: order.id,
    restaurantName: RESTAURANT.name,
    tagline: RESTAURANT.tagline,
    tableName: order.table_name ?? null,
    paidAt: order.paid_at ?? new Date().toISOString(),
    lines: lines.map((line) => ({
      quantity: line.quantity,
      name: line.display_name?.trim() || line.product_name || `Producto #${line.product_id}`,
      unitPrice: line.unit_price,
      lineTotal: line.line_total,
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
  };
}

export function formatReceiptDate(iso: string): string {
  try {
    const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T');
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(normalized));
  } catch {
    return iso;
  }
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
