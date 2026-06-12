import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { startRegistration } from '@/lib/services/registration';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;
    const result = await startRegistration({
      name: String(name ?? ''),
      email: String(email ?? ''),
      phone: String(phone ?? ''),
      password: String(password ?? ''),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al iniciar registro';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
