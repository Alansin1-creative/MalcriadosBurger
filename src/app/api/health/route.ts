import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';

export async function GET() {
  ensureInitialized();
  return NextResponse.json({ ok: true, service: 'plan-ai' });
}
