import { NextResponse } from 'next/server';
import { getOrderLines, getOrderById, assertOrderAccess } from '@/lib/services/orders';
import { ensureInitialized } from '@/lib/init';
import { requireAuth, authErrorResponse } from '@/lib/auth/guards';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureInitialized();
  try {
    const user = await requireAuth();
    const { id } = await params;
    const orderId = Number(id);
    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ ok: false, message: 'Pedido no encontrado' }, { status: 404 });
    }
    assertOrderAccess(order, user);
    const lines = getOrderLines(orderId);
    return NextResponse.json(lines);
  } catch (err) {
    return authErrorResponse(err);
  }
}
