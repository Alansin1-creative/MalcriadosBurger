import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAuth } from '@/lib/auth/guards';
import { userCanPlaceOrders } from '@/lib/auth/client-profile';
import { verifyProfileChange } from '@/lib/services/profile-update';
import { formatMexicanPhone } from '@/lib/auth/phone-validation';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { sessionId, pin } = body;
    if (!sessionId || !pin) {
      return NextResponse.json(
        { ok: false, message: 'sessionId y pin requeridos' },
        { status: 400 }
      );
    }

    const updated = verifyProfileChange(session.id, String(sessionId), String(pin));
    return NextResponse.json({
      ok: true,
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone ? formatMexicanPhone(updated.phone) : '',
        phoneRaw: updated.phone ?? '',
        canOrder: userCanPlaceOrders(updated),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al confirmar';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
