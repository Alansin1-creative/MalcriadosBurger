import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { listKitchenOrders, updateOrderStatus } from '@/lib/services/orders';
import type { OrderStatus } from '@/lib/types';

export async function GET() {
  ensureInitialized();
  try {
    await requireAdmin();
    return NextResponse.json(listKitchenOrders());
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const body = await request.json();
    const { orderId, status } = body as { orderId?: number; status?: OrderStatus };

    if (!orderId || !status) {
      return NextResponse.json(
        { ok: false, message: 'orderId y status requeridos' },
        { status: 400 }
      );
    }

    const order = updateOrderStatus(orderId, status);
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    if (err instanceof Error && err.message.includes('No se puede')) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
