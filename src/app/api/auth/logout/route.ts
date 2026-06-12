import { NextResponse } from 'next/server';
import {
  clearSessionCookies,
  destroySessionRecord,
} from '@/lib/auth/session';

export async function POST() {
  await destroySessionRecord();
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
