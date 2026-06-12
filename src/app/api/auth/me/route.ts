import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  ensureInitialized();
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user });
}
