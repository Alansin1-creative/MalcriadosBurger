import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { completeRegistration } from '@/lib/services/registration';
import { attachSessionCookies, createSessionRecord } from '@/lib/auth/session';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const body = await request.json();
    const { sessionId, emailCode, phonePin } = body;

    if (!sessionId || !emailCode || !phonePin) {
      return NextResponse.json(
        { ok: false, message: 'Código de correo y NIP del celular son requeridos' },
        { status: 400 }
      );
    }

    const user = await completeRegistration(
      String(sessionId),
      String(emailCode),
      String(phonePin)
    );

    const { sessionId: sid, user: sessionUser, expiresAt } = createSessionRecord(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
      },
    });
    attachSessionCookies(response, sid, sessionUser.role, expiresAt);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al verificar registro';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
