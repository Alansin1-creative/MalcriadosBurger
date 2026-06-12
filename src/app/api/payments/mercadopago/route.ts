import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAuth, authErrorResponse } from '@/lib/auth/guards';
import {
  assertOrderAccess,
  getOrderById,
  setMercadoPagoPreference,
} from '@/lib/services/orders';
import {
  createMercadoPagoPreference,
  getMercadoPagoCheckoutUrl,
  getMercadoPagoPaymentInfo,
  isMercadoPagoConfigured,
} from '@/lib/services/mercadopago';
import { findUserById } from '@/lib/services/users';

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

    if (order.order_type !== 'online') {
      return NextResponse.json({ ok: false, message: 'Solo pedidos en línea' }, { status: 400 });
    }

    if (order.payment_method !== 'online') {
      return NextResponse.json(
        { ok: false, message: 'Este pedido no usa pago en línea' },
        { status: 400 }
      );
    }

    if (!isMercadoPagoConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Falta MERCADOPAGO_ACCESS_TOKEN en el servidor. En Fly ejecuta: fly secrets set MERCADOPAGO_ACCESS_TOKEN=... -a malcriadosburger y vuelve a desplegar.',
        },
        { status: 503 }
      );
    }

    const profile = findUserById(user.id);
    const preference = await createMercadoPagoPreference({
      orderId: order.id,
      title: `Pedido #${order.id} — Malcriados Burger`,
      total: order.total,
      payerEmail: profile?.email,
    });

    setMercadoPagoPreference(order.id, preference.id);

    const checkoutUrl = getMercadoPagoCheckoutUrl(preference);

    return NextResponse.json({
      ok: true,
      mode: 'api',
      checkoutUrl,
      preferenceId: preference.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear pago';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function GET() {
  const info = getMercadoPagoPaymentInfo();
  return NextResponse.json({
    configured: info.available,
    mode: info.mode,
    paymentLink: info.paymentLink,
  });
}
