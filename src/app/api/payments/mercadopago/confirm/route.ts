import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAuth, authErrorResponse } from '@/lib/auth/guards';
import {
  assertOrderAccess,
  confirmOnlinePayment,
  getOrderById,
} from '@/lib/services/orders';
import { findApprovedPaymentForOrder } from '@/lib/services/mercadopago';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const user = await requireAuth();
    const body = await request.json();
    const orderId = Number(body.orderId);

    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json({ ok: false, message: 'orderId requerido' }, { status: 400 });
    }

    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, message: 'Pedido no encontrado' }, { status: 404 });
    }

    assertOrderAccess(order, user);

    if (order.payment_status === 'paid') {
      return NextResponse.json({ ok: true, alreadyPaid: true, order });
    }

    const payment = await findApprovedPaymentForOrder(orderId);
    if (!payment) {
      return NextResponse.json(
        { ok: false, message: 'Aún no confirmamos tu pago. Espera un momento e intenta de nuevo.' },
        { status: 402 }
      );
    }

    if (Math.abs((payment.transaction_amount ?? 0) - order.total) > 0.5) {
      return NextResponse.json({ ok: false, message: 'Monto del pago no coincide' }, { status: 400 });
    }

    const updated = confirmOnlinePayment(orderId);
    return NextResponse.json({ ok: true, order: updated });
  } catch (err) {
    return authErrorResponse(err);
  }
}
