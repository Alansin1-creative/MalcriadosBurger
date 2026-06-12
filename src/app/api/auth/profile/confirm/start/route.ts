import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAuth } from '@/lib/auth/guards';
import { startProfileChange } from '@/lib/services/profile-update';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const session = await requireAuth();
    const body = await request.json();
    const result = await startProfileChange(session.id, {
      name: String(body.name ?? ''),
      phone: String(body.phone ?? ''),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al iniciar confirmación';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
