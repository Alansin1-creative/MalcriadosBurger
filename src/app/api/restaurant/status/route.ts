import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import {
  getRestaurantStatus,
  setRestaurantOpen,
} from '@/lib/services/restaurant-settings';

export async function GET() {
  ensureInitialized();
  return NextResponse.json(getRestaurantStatus());
}

export async function PATCH(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const { isOpen } = await request.json();
    if (typeof isOpen !== 'boolean') {
      return NextResponse.json({ ok: false, message: 'isOpen requerido' }, { status: 400 });
    }
    const status = setRestaurantOpen(isOpen);
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    return authErrorResponse(err);
  }
}
