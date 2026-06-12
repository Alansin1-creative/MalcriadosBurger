import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { resendRegistrationCode } from '@/lib/services/registration';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const body = await request.json();
    const { sessionId, channel } = body;

    if (!sessionId || (channel !== 'email' && channel !== 'phone')) {
      return NextResponse.json(
        { ok: false, message: 'sessionId y channel (email|phone) requeridos' },
        { status: 400 }
      );
    }

    await resendRegistrationCode(String(sessionId), channel);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo reenviar el código';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
