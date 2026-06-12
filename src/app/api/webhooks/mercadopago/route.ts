import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { fetchMercadoPagoPayment } from '@/lib/services/mercadopago';
import { confirmOnlinePayment, getOrderById } from '@/lib/services/orders';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    if (topic !== 'payment' || !id) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = await fetchMercadoPagoPayment(id);
    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true, status: payment.status });
    }

    const orderId = Number(payment.external_reference);
    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json({ ok: false, message: 'Sin referencia de pedido' }, { status: 400 });
    }

    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, message: 'Pedido no encontrado' }, { status: 404 });
    }

    if (Math.abs((payment.transaction_amount ?? 0) - order.total) > 0.5) {
      return NextResponse.json({ ok: false, message: 'Monto no coincide' }, { status: 400 });
    }

    confirmOnlinePayment(orderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook mercadopago]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
