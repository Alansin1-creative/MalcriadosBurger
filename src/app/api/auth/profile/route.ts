import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAuth, authErrorResponse } from '@/lib/auth/guards';
import { userCanPlaceOrders } from '@/lib/auth/client-profile';
import { findUserById } from '@/lib/services/users';
import { formatMexicanPhone } from '@/lib/auth/phone-validation';

export async function GET() {
  ensureInitialized();
  try {
    const session = await requireAuth();
    const user = findUserById(session.id);
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ? formatMexicanPhone(user.phone) : '',
        phoneRaw: user.phone ?? '',
        canOrder: userCanPlaceOrders(user),
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH() {
  return NextResponse.json(
    {
      ok: false,
      message: 'Confirma los cambios con el NIP enviado a tu celular',
    },
    { status: 400 }
  );
}
