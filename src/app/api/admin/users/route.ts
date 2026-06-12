import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { listUsers, updateUser } from '@/lib/services/users';
import type { UserRole } from '@/lib/types';

export async function GET() {
  ensureInitialized();
  try {
    await requireAdmin();
    return NextResponse.json(listUsers());
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, name, role, active } = body;
    if (!id) {
      return NextResponse.json({ ok: false, message: 'id requerido' }, { status: 400 });
    }
    const user = updateUser(Number(id), {
      name: typeof name === 'string' ? name : undefined,
      role: role === 'admin' || role === 'client' ? (role as UserRole) : undefined,
      active: typeof active === 'number' ? active : active === true ? 1 : active === false ? 0 : undefined,
    });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    return authErrorResponse(err);
  }
}
