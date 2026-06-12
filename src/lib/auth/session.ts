import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getDb } from '../db';
import { userCanPlaceOrders } from './client-profile';
import type { SessionUser, UserRole } from '../types';

export const SESSION_COOKIE = 'session_id';
export const ROLE_COOKIE = 'user_role';
const SESSION_DAYS = 30;

type SessionRow = {
  id: string;
  user_id: number;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  expires_at: string;
  active: number;
};

function toSessionUser(row: {
  user_id?: number;
  id?: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
}): SessionUser {
  const id = row.user_id ?? row.id!;
  const phone = row.phone ?? null;
  return {
    id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone,
    canOrder: userCanPlaceOrders({ email: row.email, phone }),
  };
}

function toSqliteDatetime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function cookieOptions(expiresAt: Date) {
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  };
}

function findSession(sessionId: string): SessionRow | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.id, s.user_id, s.expires_at, u.email, u.name, u.role, u.phone, u.active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .get(sessionId) as SessionRow | undefined;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = findSession(sessionId);
  if (!row || row.active !== 1) return null;

  return toSessionUser({
    user_id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone,
  });
}

export function createSessionRecord(userId: number): {
  sessionId: string;
  user: SessionUser;
  expiresAt: Date;
} {
  const db = getDb();
  const user = db
    .prepare('SELECT id, email, name, role, phone FROM users WHERE id = ? AND active = 1')
    .get(userId) as { id: number; email: string; name: string; role: UserRole; phone: string | null } | undefined;
  if (!user) throw new Error('Usuario no encontrado');
  const sessionUser = toSessionUser(user);

  const sessionId = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    sessionId,
    userId,
    toSqliteDatetime(expiresAt)
  );

  return { sessionId, user: sessionUser, expiresAt };
}

export function attachSessionCookies(
  response: NextResponse,
  sessionId: string,
  role: UserRole,
  expiresAt: Date
) {
  const opts = cookieOptions(expiresAt);
  response.cookies.set(SESSION_COOKIE, sessionId, { ...opts, httpOnly: true });
  response.cookies.set(ROLE_COOKIE, role, { ...opts, httpOnly: false });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
}

export async function destroySessionRecord(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  if (sessionId) {
    getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  return sessionId;
}

/** @deprecated use createSessionRecord + attachSessionCookies */
export async function createSession(userId: number): Promise<string> {
  const { sessionId, user, expiresAt } = createSessionRecord(userId);
  const cookieStore = await cookies();
  const opts = cookieOptions(expiresAt);
  cookieStore.set(SESSION_COOKIE, sessionId, { ...opts, httpOnly: true });
  cookieStore.set(ROLE_COOKIE, user.role, { ...opts, httpOnly: false });
  return sessionId;
}

/** @deprecated use destroySessionRecord + clearSessionCookies */
export async function destroySession(): Promise<void> {
  await destroySessionRecord();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
}
