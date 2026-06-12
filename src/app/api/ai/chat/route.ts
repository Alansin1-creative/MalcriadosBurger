import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { answerQuestion } from '@/lib/ai/assistant';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const { message } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, message: 'Mensaje requerido' }, { status: 400 });
    }
    const reply = answerQuestion(message);
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    return authErrorResponse(err);
  }
}
