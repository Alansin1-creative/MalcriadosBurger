import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  ServiceMode,
} from '@/lib/types';
import { getClientDb } from './config';
import { nextNumericId } from './ids';
import { getProductById } from './products';
import { getTableName } from './tables';
import { getUserProfile } from './auth';

const TAX_RATE = 0;

type OrderDoc = Order & {
  user_uid?: string | null;
  table_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
};

async function getUserMeta(uid: string | null) {
  if (!uid) return {};
  const profile = await getUserProfile(uid);
  if (!profile) return {};
  return { user_name: profile.name, user_email: profile.email };
}

export async function getOrderById(orderId: number): Promise<Order | undefined> {
  const snap = await getDoc(doc(getClientDb(), 'orders', String(orderId)));
  if (!snap.exists()) return undefined;
  return snap.data() as OrderDoc;
}

export async function getOrderLines(orderId: number): Promise<OrderLine[]> {
  const snap = await getDocs(collection(getClientDb(), 'orders', String(orderId), 'lines'));
  return snap.docs.map((d) => {
    const line = d.data() as OrderLine;
    return {
      ...line,
      product_name: line.display_name?.trim() || line.product_name,
    };
  });
}

export async function countOrderLines(orderId: number): Promise<number> {
  const snap = await getDocs(collection(getClientDb(), 'orders', String(orderId), 'lines'));
  return snap.size;
}

export async function listOrdersByUser(uid: string): Promise<Order[]> {
  const db = getClientDb();
  const snap = await getDocs(query(collection(db, 'orders'), where('user_uid', '==', uid)));
  return snap.docs
    .map((d) => d.data() as OrderDoc)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listKitchenOrders(): Promise<(Order & { lines: OrderLine[] })[]> {
  const db = getClientDb();
  const statuses: OrderStatus[] = ['open', 'preparing', 'served'];
  const results: (Order & { lines: OrderLine[] })[] = [];
  for (const status of statuses) {
    const snap = await getDocs(query(collection(db, 'orders'), where('status', '==', status)));
    for (const orderDoc of snap.docs) {
      const order = orderDoc.data() as OrderDoc;
      if (order.order_type !== 'online' && order.order_type !== 'pos') continue;
      const lines = await getOrderLines(order.id);
      if (status === 'open' && lines.length === 0) continue;
      results.push({ ...order, lines });
    }
  }
  return results.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function recalculateOrder(orderId: number): Promise<void> {
  const lines = await getOrderLines(orderId);
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  await updateDoc(doc(getClientDb(), 'orders', String(orderId)), { subtotal, tax, total });
}

export async function replaceOrderLines(
  orderId: number,
  lines: {
    productId: number;
    quantity: number;
    unitPrice: number;
    displayName: string;
    modifiers?: unknown;
  }[]
): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.status !== 'open') throw new Error('Solo se pueden modificar pedidos abiertos');

  const db = getClientDb();
  const existing = await getDocs(collection(db, 'orders', String(orderId), 'lines'));
  await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const product = await getProductById(line.productId);
    if (!product) continue;
    const lineId = await nextNumericId('order_lines');
    const lineTotal = line.unitPrice * line.quantity;
    await setDoc(doc(db, 'orders', String(orderId), 'lines', String(lineId)), {
      id: lineId,
      order_id: orderId,
      product_id: line.productId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      line_total: lineTotal,
      display_name: line.displayName,
      modifiers_json: line.modifiers !== undefined ? JSON.stringify(line.modifiers) : '[]',
      product_name: product.name,
      category: product.category,
    } satisfies OrderLine);
  }
  await recalculateOrder(orderId);
}

export function isOnlineOrderBlockingNew(order: Order, lineCount: number): boolean {
  if (order.order_type !== 'online') return false;
  if (order.status === 'preparing' || order.status === 'served') return true;
  if (order.status === 'open') return lineCount > 0;
  return false;
}

export function activeOnlineOrderMessage(order: Order): string {
  if (order.status === 'preparing') return 'Tienes un pedido en cocina. Espera a recogerlo antes de pedir de nuevo.';
  if (order.status === 'served') return 'Tienes un pedido listo para recoger.';
  return 'Tienes un pedido abierto. Termínalo o envíalo a cocina.';
}

export async function getBlockingOnlineOrderForUser(uid: string): Promise<Order | undefined> {
  const orders = await listOrdersByUser(uid);
  for (const o of orders) {
    if (o.order_type !== 'online') continue;
    if (o.status === 'preparing' || o.status === 'served') return o;
    if (o.status === 'open' && (await countOrderLines(o.id)) > 0) return o;
  }
  return undefined;
}

export async function getResumableOnlineDraftForUser(uid: string): Promise<Order | undefined> {
  const orders = await listOrdersByUser(uid);
  for (const o of orders) {
    if (o.order_type === 'online' && o.status === 'open' && (await countOrderLines(o.id)) === 0) {
      return o;
    }
  }
  return undefined;
}

export async function getActiveOnlineOrderForUser(uid: string): Promise<
  (Order & { blocksNewOrder: boolean; message: string | null; lines?: OrderLine[] }) | null
> {
  const blocking = await getBlockingOnlineOrderForUser(uid);
  const draft = blocking ?? (await getResumableOnlineDraftForUser(uid));
  if (!draft) return null;
  const lineCount = await countOrderLines(draft.id);
  const blocksNewOrder = isOnlineOrderBlockingNew(draft, lineCount);
  return {
    ...draft,
    blocksNewOrder,
    message: blocksNewOrder ? activeOnlineOrderMessage(draft) : null,
    lines: draft.status === 'open' ? await getOrderLines(draft.id) : undefined,
  };
}

export async function createOnlineOrder(uid: string): Promise<number> {
  const db = getClientDb();
  const id = await nextNumericId('orders');
  const userMeta = await getUserMeta(uid);
  const docData: OrderDoc = {
    id,
    table_id: null,
    user_id: null,
    user_uid: uid,
    order_type: 'online',
    status: 'open',
    subtotal: 0,
    tax: 0,
    total: 0,
    created_at: new Date().toISOString(),
    paid_at: null,
    payment_status: 'pending',
    ...userMeta,
  };
  await setDoc(doc(db, 'orders', String(id)), docData);
  return id;
}

export async function createOrResumeOnlineOrder(uid: string): Promise<number> {
  const draft = await getResumableOnlineDraftForUser(uid);
  if (draft) return draft.id;
  const blocking = await getBlockingOnlineOrderForUser(uid);
  if (blocking) throw new Error(activeOnlineOrderMessage(blocking));
  return createOnlineOrder(uid);
}

export async function submitOnlineOrder(
  orderId: number,
  options: {
    serviceMode: ServiceMode;
    tableId: number | null;
    paymentMethod: PaymentMethod;
  }
): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.status !== 'open') throw new Error('Pedido no editable');
  const lines = await getOrderLines(orderId);
  if (!lines.length) throw new Error('Agrega productos antes de enviar');

  const db = getClientDb();
  const ref = doc(db, 'orders', String(orderId));

  if (options.serviceMode === 'takeaway') {
    await updateDoc(ref, {
      service_mode: 'takeaway',
      table_id: null,
      payment_method: options.paymentMethod,
      payment_status: 'pending',
      status: 'preparing',
      preparing_at: new Date().toISOString(),
      table_name: null,
    });
  } else {
    const tableId = options.tableId;
    if (!tableId) throw new Error('Selecciona un asiento disponible');
    const table_name = await getTableName(tableId);
    await updateDoc(ref, {
      service_mode: 'dine_in',
      table_id: tableId,
      payment_method: options.paymentMethod,
      payment_status: 'pending',
      status: 'preparing',
      preparing_at: new Date().toISOString(),
      ...(table_name ? { table_name } : {}),
    });
    await updateDoc(doc(db, 'tables', String(tableId)), { status: 'occupied' });
  }

  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Pedido no encontrado');
  return updated;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Pedido no encontrado');

  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === 'preparing' && !order.preparing_at) patch.preparing_at = now;
  if (status === 'served') {
    patch.served_at = now;
    if (order.preparing_at) {
      patch.prep_seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(order.preparing_at).getTime()) / 1000)
      );
    }
  }
  if (status === 'paid') {
    patch.paid_at = now;
    patch.payment_status = 'paid';
  }

  await updateDoc(doc(getClientDb(), 'orders', String(orderId)), patch);
  const updated = await getOrderById(orderId);
  if (!updated) throw new Error('Pedido no encontrado');
  return updated;
}

export async function listMyOrdersWithLines(uid: string): Promise<(Order & { lines: OrderLine[] })[]> {
  const orders = await listOrdersByUser(uid);
  const withLines = await Promise.all(
    orders.map(async (order) => ({ ...order, lines: await getOrderLines(order.id) }))
  );
  return withLines;
}
