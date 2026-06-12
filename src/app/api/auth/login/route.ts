import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { findUserByEmail } from '@/lib/services/users';
import { verifyPassword } from '@/lib/auth/password';
import {
  attachSessionCookies,
  createSessionRecord,
} from '@/lib/auth/session';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: 'Correo y contraseña requeridos' },
        { status: 400 }
      );
    }

    const user = findUserByEmail(String(email));
    if (!user || user.active !== 1) {
      return NextResponse.json(
        { ok: false, message: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(String(password), user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, message: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }

    if (user.role === 'client') {
      const emailVerified = (user as { email_verified?: number }).email_verified ?? 1;
      const phoneVerified = (user as { phone_verified?: number }).phone_verified ?? 1;
      if (!emailVerified || !phoneVerified) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Tu cuenta no está verificada. Completa el registro con correo y celular.',
          },
          { status: 403 }
        );
      }
    }

    const { sessionId, user: sessionUser, expiresAt } = createSessionRecord(user.id);
    const response = NextResponse.json({
      ok: true,
      user: sessionUser,
    });
    attachSessionCookies(response, sessionId, sessionUser.role, expiresAt);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
