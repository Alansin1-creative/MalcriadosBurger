import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, requireAuth, authErrorResponse } from '@/lib/auth/guards';
import { updateTableStatus } from '@/lib/services/orders';
import { listRestaurantSeating } from '@/lib/services/seating';

export async function GET() {
  ensureInitialized();
  try {
    await requireAuth();
    return NextResponse.json(listRestaurantSeating());
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const { id, status } = await request.json();
    const seat = listRestaurantSeating().find((t) => t.id === id);
    if (!seat) {
      return NextResponse.json({ ok: false, message: 'Lugar no encontrado' }, { status: 404 });
    }
    updateTableStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
