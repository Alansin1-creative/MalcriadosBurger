import { getDb } from '../db';
import { deductInventoryForOrder } from './inventory';
import { assertSeatAssignable, isSeatAvailable, listRestaurantSeating } from './seating';
import type {
  Order,
  OrderLine,
  OrderStatus,
  OrderType,
  PaymentMethod,
  ServiceMode,
} from '../types';

const TAX_RATE = 0;

export function listOrders(status?: OrderStatus, userId?: number): Order[] {
  const db = getDb();
  const base = `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email
     FROM orders o
     LEFT JOIN tables t ON t.id = o.table_id
     LEFT JOIN users u ON u.id = o.user_id`;

  if (userId && status) {
    return db
      .prepare(`${base} WHERE o.user_id = ? AND o.status = ? ORDER BY o.created_at DESC`)
      .all(userId, status) as Order[];
  }
  if (userId) {
    return db
      .prepare(`${base} WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 50`)
      .all(userId) as Order[];
  }
  if (status) {
    return db
      .prepare(`${base} WHERE o.status = ? ORDER BY o.created_at DESC`)
      .all(status) as Order[];
  }
  return db.prepare(`${base} ORDER BY o.created_at DESC LIMIT 50`).all() as Order[];
}

export function getOrderLines(orderId: number): OrderLine[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ol.*, p.name as product_name, p.category FROM order_lines ol
       JOIN products p ON p.id = ol.product_id
       WHERE ol.order_id = ?`
    )
    .all(orderId) as OrderLine[];

  return rows.map((r) => ({
    ...r,
    product_name: r.display_name?.trim() || r.product_name,
  }));
}

export function listPayableOrders(): Order[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.status IN ('open', 'preparing', 'served')
         AND EXISTS (SELECT 1 FROM order_lines ol WHERE ol.order_id = o.id)
         AND COALESCE(o.payment_status, 'pending') = 'pending'
       ORDER BY
         CASE o.status WHEN 'served' THEN 0 WHEN 'preparing' THEN 1 ELSE 2 END,
         o.created_at ASC`
    )
    .all() as Order[];
}

export function getOpenOrder(orderId: number): Order | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = ? AND o.status = 'open'`
    )
    .get(orderId) as Order | undefined;
}

export type SyncOrderLineInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
  displayName: string;
  modifiers?: unknown;
};

export function replaceOrderLines(orderId: number, lines: SyncOrderLineInput[]) {
  const db = getDb();
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId) as
    | { status: string }
    | undefined;
  if (!order) throw new Error('Pedido no encontrado');
  if (order.status !== 'open') throw new Error('Solo se pueden modificar pedidos abiertos');

  const del = db.prepare('DELETE FROM order_lines WHERE order_id = ?');
  del.run(orderId);

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    addOrderLine(orderId, line.productId, line.quantity, {
      unitPrice: line.unitPrice,
      displayName: line.displayName,
      modifiers: line.modifiers,
    });
  }
}

export function createOrder(
  tableId: number | null,
  options?: { userId?: number | null; orderType?: OrderType }
) {
  const db = getDb();
  const userId = options?.userId ?? null;
  const orderType = options?.orderType ?? (userId ? 'online' : 'pos');
  const result = db
    .prepare(
      `INSERT INTO orders (table_id, user_id, order_type, status, subtotal, tax, total)
       VALUES (?, ?, ?, 'open', 0, 0, 0)`
    )
    .run(tableId, userId, orderType);
  if (tableId) {
    db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableId);
  }
  return Number(result.lastInsertRowid);
}

export function addOrderLine(
  orderId: number,
  productId: number,
  quantity: number,
  options?: {
    unitPrice?: number;
    displayName?: string;
    modifiers?: unknown;
  }
) {
  const db = getDb();
  const product = db.prepare('SELECT price, name FROM products WHERE id = ?').get(productId) as
    | { price: number; name: string }
    | undefined;
  if (!product) throw new Error('Producto no encontrado');

  const unitPrice = options?.unitPrice ?? product.price;
  const lineTotal = unitPrice * quantity;
  const displayName = options?.displayName ?? product.name;
  const modifiersJson =
    options?.modifiers !== undefined ? JSON.stringify(options.modifiers) : '[]';

  db.prepare(
    `INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total, display_name, modifiers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(orderId, productId, quantity, unitPrice, lineTotal, displayName, modifiersJson);
  recalculateOrder(orderId);
}

export function recalculateOrder(orderId: number) {
  const db = getDb();
  const sum = db
    .prepare('SELECT COALESCE(SUM(line_total), 0) as subtotal FROM order_lines WHERE order_id = ?')
    .get(orderId) as { subtotal: number };
  const subtotal = sum.subtotal;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  db.prepare('UPDATE orders SET subtotal = ?, tax = ?, total = ? WHERE id = ?').run(
    subtotal,
    tax,
    total,
    orderId
  );
}

export function getOrderById(orderId: number): Order | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.id = ?`
    )
    .get(orderId) as Order | undefined;
}

/** Pedido en línea que impide crear otro (en cocina, listo o enviado sin pagar). */
export function getBlockingOnlineOrderForUser(userId: number): Order | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = ? AND o.order_type = 'online'
         AND (
           o.status IN ('preparing', 'served')
           OR (o.status = 'open' AND EXISTS (SELECT 1 FROM order_lines ol WHERE ol.order_id = o.id))
         )
       ORDER BY o.created_at DESC
       LIMIT 1`
    )
    .get(userId) as Order | undefined;
}

/** Borrador vacío reanudable (open sin líneas). */
export function getResumableOnlineDraftForUser(userId: number): Order | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.user_id = ? AND o.order_type = 'online' AND o.status = 'open'
         AND NOT EXISTS (SELECT 1 FROM order_lines ol WHERE ol.order_id = o.id)
       ORDER BY o.created_at DESC
       LIMIT 1`
    )
    .get(userId) as Order | undefined;
}

/** Pedido en línea no pagado (bloqueante o borrador vacío). */
export function getActiveOnlineOrderForUser(userId: number): Order | undefined {
  return getBlockingOnlineOrderForUser(userId) ?? getResumableOnlineDraftForUser(userId);
}

export function countOrderLines(orderId: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as c FROM order_lines WHERE order_id = ?')
    .get(orderId) as { c: number };
  return row.c;
}

/** El cliente no puede armar otro pedido hasta pagar el activo. */
export function isOnlineOrderBlockingNew(order: Order): boolean {
  if (order.order_type !== 'online') return false;
  if (order.status === 'preparing' || order.status === 'served') return true;
  if (order.status === 'open') return countOrderLines(order.id) > 0;
  return false;
}

export function activeOnlineOrderMessage(order: Order): string {
  const prepaid = order.payment_status === 'paid';
  if (order.status === 'preparing') {
    return prepaid
      ? `Ya tienes el pedido #${order.id} en cocina (pagado). Espera a que esté listo antes de pedir otro.`
      : `Ya tienes el pedido #${order.id} en cocina. Espera a que esté listo y págalo en mostrador antes de pedir otro.`;
  }
  if (order.status === 'served') {
    return prepaid
      ? `Ya tienes el pedido #${order.id} listo para recoger (pagado en línea).`
      : `Ya tienes el pedido #${order.id} listo para recoger. Págalo en mostrador antes de hacer otro pedido.`;
  }
  return prepaid
    ? `Ya tienes el pedido #${order.id} en curso (pagado). Revisa Mis pedidos.`
    : `Ya tienes el pedido #${order.id} en curso. Revisa Mis pedidos y espera a pagarlo.`;
}

export function createOrResumeOnlineOrder(userId: number): number {
  const blocking = getBlockingOnlineOrderForUser(userId);
  if (blocking) {
    throw new Error(activeOnlineOrderMessage(blocking));
  }
  const draft = getResumableOnlineDraftForUser(userId);
  if (draft) return draft.id;
  return createOrder(null, { userId, orderType: 'online' });
}

export function assertClientOnlineOrderTarget(userId: number, orderId: number) {
  const blocking = getBlockingOnlineOrderForUser(userId);
  if (blocking && blocking.id !== orderId) {
    throw new Error(activeOnlineOrderMessage(blocking));
  }
}

export function assertOrderAccess(order: Order, user: { id: number; role: string }) {
  if (user.role === 'admin') return;
  if (order.user_id !== user.id) throw new Error('No tienes acceso a este pedido');
}

export type OnlineSubmitOptions = {
  serviceMode: ServiceMode;
  tableId?: number | null;
  paymentMethod: PaymentMethod;
};

export function submitOnlineOrder(orderId: number, options: OnlineSubmitOptions): Order {
  const db = getDb();
  const order = getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.order_type !== 'online') throw new Error('Solo pedidos en línea');
  if (order.status !== 'open') throw new Error('El pedido ya fue enviado');

  const lineCount = db
    .prepare('SELECT COUNT(*) as c FROM order_lines WHERE order_id = ?')
    .get(orderId) as { c: number };
  if (lineCount.c === 0) throw new Error('Agrega al menos un platillo');

  if (options.paymentMethod !== 'cash' && options.paymentMethod !== 'online') {
    throw new Error('Elige un método de pago');
  }

  if (options.serviceMode === 'takeaway') {
    db.prepare(
      `UPDATE orders SET service_mode = ?, table_id = NULL, payment_method = ?, payment_status = 'pending'
       WHERE id = ?`
    ).run('takeaway', options.paymentMethod, orderId);
  } else {
    const tableId = options.tableId ?? null;
    if (!tableId) throw new Error('Selecciona un asiento disponible');

    const seats = listRestaurantSeating();
    if (seats.filter((s) => isSeatAvailable(s.status)).length === 0) {
      throw new Error('No hay asientos libres en el local');
    }

    assertSeatAssignable(tableId);
    db.prepare(
      `UPDATE orders SET service_mode = ?, table_id = ?, payment_method = ?, payment_status = 'pending'
       WHERE id = ?`
    ).run('dine_in', tableId, options.paymentMethod, orderId);
    db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(tableId);
  }

  // Queda en "open" para que aparezca en Nuevos; cocina pulsa Empezar → preparing
  return getOrderById(orderId)!;
}

export function setMercadoPagoPreference(orderId: number, preferenceId: string) {
  const db = getDb();
  db.prepare('UPDATE orders SET mp_preference_id = ? WHERE id = ?').run(preferenceId, orderId);
}

export function confirmOnlinePayment(orderId: number): Order {
  const db = getDb();
  const order = getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.payment_status === 'paid') return order;

  deductInventoryForOrder(orderId);
  db.prepare(
    `UPDATE orders SET payment_status = 'paid', paid_at = datetime('now') WHERE id = ?`
  ).run(orderId);

  const updated = getOrderById(orderId)!;
  if (updated.status === 'served') {
    db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
    if (updated.table_id) {
      db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(updated.table_id);
    }
    return getOrderById(orderId)!;
  }

  return updated;
}

export function payOrder(orderId: number): Order {
  const db = getDb();
  const order = getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.status === 'paid') throw new Error('Pedido ya pagado');

  if (order.payment_status !== 'paid') {
    deductInventoryForOrder(orderId);
  }
  db.prepare(
    `UPDATE orders SET status = 'paid', payment_status = 'paid',
     paid_at = COALESCE(paid_at, datetime('now')) WHERE id = ?`
  ).run(orderId);

  if (order.table_id) {
    db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(order.table_id);
  }

  return getOrderById(orderId)!;
}

export function updateTableStatus(tableId: number, status: string) {
  const db = getDb();
  db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, tableId);
}

export function onlineServiceLabel(order: Order): string {
  if (order.service_mode === 'takeaway') return 'Para llevar';
  if (order.table_name) return order.table_name;
  if (order.service_mode === 'dine_in') return 'En local';
  return 'En línea';
}

export type KitchenOrder = Order & { lines: OrderLine[] };

const KITCHEN_STATUSES: OrderStatus[] = ['open', 'preparing', 'served'];

const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  open: ['preparing'],
  preparing: ['served', 'open'],
  served: ['preparing'],
};

export function listKitchenOrders(): KitchenOrder[] {
  const db = getDb();
  const orders = db
    .prepare(
      `SELECT o.*, t.name as table_name, u.name as user_name, u.email as user_email FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.status IN ('open', 'preparing', 'served')
         AND EXISTS (SELECT 1 FROM order_lines ol WHERE ol.order_id = o.id)
       ORDER BY
         CASE o.status WHEN 'open' THEN 0 WHEN 'preparing' THEN 1 ELSE 2 END,
         o.created_at ASC`
    )
    .all() as Order[];

  return orders.map((order) => ({
    ...order,
    lines: getOrderLines(order.id),
  }));
}

export function updateOrderStatus(orderId: number, status: OrderStatus): Order {
  const db = getDb();
  const order = getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');

  const allowed = STATUS_TRANSITIONS[order.status];
  if (!allowed?.includes(status)) {
    throw new Error(`No se puede cambiar de "${order.status}" a "${status}"`);
  }
  if (!KITCHEN_STATUSES.includes(status) && status !== 'open') {
    throw new Error('Estado no válido para cocina');
  }

  if (status === 'preparing') {
    db.prepare(
      `UPDATE orders SET status = 'preparing', preparing_at = datetime('now'), served_at = NULL, prep_seconds = NULL
       WHERE id = ?`
    ).run(orderId);
  } else if (status === 'served') {
    db.prepare(
      `UPDATE orders SET
         status = 'served',
         served_at = datetime('now'),
         prep_seconds = CASE
           WHEN preparing_at IS NOT NULL THEN CAST((julianday(datetime('now')) - julianday(preparing_at)) * 86400 AS INTEGER)
           ELSE NULL
         END
       WHERE id = ?`
    ).run(orderId);

    const refreshed = getOrderById(orderId)!;
    if (refreshed.payment_status === 'paid') {
      db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
      if (refreshed.table_id) {
        db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(refreshed.table_id);
      }
    }
  } else if (status === 'open') {
    db.prepare(
      `UPDATE orders SET status = 'open', preparing_at = NULL, served_at = NULL, prep_seconds = NULL WHERE id = ?`
    ).run(orderId);
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
  }

  return getOrderById(orderId)!;
}
