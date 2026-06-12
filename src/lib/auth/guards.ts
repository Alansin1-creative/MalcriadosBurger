import { NextResponse } from 'next/server';
import { getSession } from './session';
import type { SessionUser, UserRole } from '../types';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError('Debes iniciar sesión');
  return user;
}

export async function requireRole(role: UserRole): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== role) throw new AuthError('No tienes permiso para esta acción', 403);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('admin');
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : 'Error interno';
  return NextResponse.json({ ok: false, message }, { status: 500 });
}
