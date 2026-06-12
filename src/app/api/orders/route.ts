import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAuth, requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { buildSalesReceipt } from '@/lib/receipt/sales-receipt';
import {
  listOrders,
  createOrder,
  addOrderLine,
  payOrder,
  getOrderLines,
  replaceOrderLines,
  getOrderById,
  assertOrderAccess,
  submitOnlineOrder,
  listPayableOrders,
  getActiveOnlineOrderForUser,
  isOnlineOrderBlockingNew,
  activeOnlineOrderMessage,
  createOrResumeOnlineOrder,
  assertClientOnlineOrderTarget,
  type SyncOrderLineInput,
} from '@/lib/services/orders';
import {
  assertRestaurantOpen,
  assertRestaurantAcceptsOnlineOrders,
} from '@/lib/services/restaurant-settings';
import { assertClientCanPlaceOrders } from '@/lib/auth/client-profile';
import { findUserById } from '@/lib/services/users';

function requireClientOrderProfile(userId: number) {
  const profile = findUserById(userId);
  if (!profile) throw new Error('Usuario no encontrado');
  assertClientCanPlaceOrders(profile);
}

export async function GET(request: Request) {
  ensureInitialized();
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const mine = searchParams.get('mine') === '1';
    const payable = searchParams.get('payable') === '1';

    if (payable) {
      await requireAdmin();
      return NextResponse.json(listPayableOrders());
    }

    if (mine && searchParams.get('active') === '1') {
      const active = getActiveOnlineOrderForUser(user.id);
      if (!active) return NextResponse.json(null);
      return NextResponse.json({
        ...active,
        lines: getOrderLines(active.id),
        blocksNewOrder: isOnlineOrderBlockingNew(active),
        message: isOnlineOrderBlockingNew(active) ? activeOnlineOrderMessage(active) : null,
      });
    }

    if (mine && searchParams.get('withLines') === '1') {
      const orders = listOrders(status as Parameters<typeof listOrders>[0], user.id);
      return NextResponse.json(
        orders.map((order) => ({ ...order, lines: getOrderLines(order.id) }))
      );
    }

    if (user.role === 'client' || mine) {
      const orders = listOrders(status as Parameters<typeof listOrders>[0], user.id);
      return NextResponse.json(orders);
    }

    const orders = listOrders(status as Parameters<typeof listOrders>[0]);
    return NextResponse.json(orders);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const user = await requireAuth();
    const body = await request.json();
    const {
      action,
      tableId,
      orderId,
      productId,
      quantity,
      unitPrice,
      displayName,
      modifiers,
      lines,
      serviceMode,
      paymentMethod,
    } = body;

    if (action === 'create') {
      if (user.role === 'client') {
        assertRestaurantAcceptsOnlineOrders();
        requireClientOrderProfile(user.id);
        const id = createOrResumeOnlineOrder(user.id);
        return NextResponse.json({ ok: true, orderId: id });
      }
      await requireAdmin();
      assertRestaurantOpen();
      const id = createOrder(tableId ?? null, { orderType: 'pos' });
      return NextResponse.json({ ok: true, orderId: id });
    }

    if (action === 'add_line') {
      const order = getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ ok: false, message: 'Pedido no encontrado' }, { status: 404 });
      }
      assertOrderAccess(order, user);
      if (user.role === 'client') {
        assertRestaurantAcceptsOnlineOrders();
        requireClientOrderProfile(user.id);
        assertClientOnlineOrderTarget(user.id, orderId);
        if (order.status !== 'open') {
          return NextResponse.json({ ok: false, message: 'Pedido no editable' }, { status: 400 });
        }
      }
      addOrderLine(orderId, productId, quantity, {
        unitPrice: typeof unitPrice === 'number' ? unitPrice : undefined,
        displayName: typeof displayName === 'string' ? displayName : undefined,
        modifiers: modifiers !== undefined ? modifiers : undefined,
      });
      return NextResponse.json({ ok: true, lines: getOrderLines(orderId) });
    }

    if (action === 'submit') {
      const order = getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ ok: false, message: 'Pedido no encontrado' }, { status: 404 });
      }
      assertOrderAccess(order, user);
      if (user.role === 'client') {
        assertRestaurantAcceptsOnlineOrders();
        requireClientOrderProfile(user.id);
        assertClientOnlineOrderTarget(user.id, orderId);
      }
      if (user.role === 'client') {
        if (serviceMode !== 'takeaway' && serviceMode !== 'dine_in') {
          return NextResponse.json(
            { ok: false, message: 'Indica si es para llevar o para comer en el local' },
            { status: 400 }
          );
        }
        if (paymentMethod !== 'cash' && paymentMethod !== 'online') {
          return NextResponse.json(
            { ok: false, message: 'Elige efectivo o pago en línea' },
            { status: 400 }
          );
        }
        const updated = submitOnlineOrder(orderId, {
          serviceMode,
          tableId: typeof tableId === 'number' ? tableId : null,
          paymentMethod,
        });
        return NextResponse.json({ ok: true, order: updated });
      }
      const updated = submitOnlineOrder(orderId, {
        serviceMode: 'takeaway',
        tableId: null,
        paymentMethod: 'cash',
      });
      return NextResponse.json({ ok: true, order: updated });
    }

    if (action === 'pay') {
      await requireAdmin();
      const order = payOrder(orderId);
      const orderLines = getOrderLines(orderId);
      const receipt = buildSalesReceipt(order, orderLines);
      return NextResponse.json({ ok: true, receipt });
    }

    if (action === 'sync_cart') {
      if (!orderId || !Array.isArray(lines)) {
        return NextResponse.json(
          { ok: false, message: 'orderId y lines requeridos' },
          { status: 400 }
        );
      }
      const order = getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ ok: false, message: 'Pedido no encontrado' }, { status: 404 });
      }
      assertOrderAccess(order, user);
      if (user.role === 'client') {
        assertRestaurantAcceptsOnlineOrders();
        requireClientOrderProfile(user.id);
        assertClientOnlineOrderTarget(user.id, orderId);
        if (order.status !== 'open') {
          return NextResponse.json({ ok: false, message: 'Pedido no editable' }, { status: 400 });
        }
      }

      const normalized: SyncOrderLineInput[] = lines
        .filter((l: SyncOrderLineInput) => l.quantity > 0)
        .map((l: SyncOrderLineInput) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          displayName: String(l.displayName ?? ''),
          modifiers: l.modifiers,
        }));
      replaceOrderLines(orderId, normalized);
      return NextResponse.json({ ok: true, lines: getOrderLines(orderId) });
    }

    return NextResponse.json({ ok: false, message: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('acceso')) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : 'Error en pedido';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
