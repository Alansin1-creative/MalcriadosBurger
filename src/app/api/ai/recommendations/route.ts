import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { generateRecommendations } from '@/lib/ai/recommendations';

export async function GET() {
  ensureInitialized();
  try {
    await requireAdmin();
    return NextResponse.json(generateRecommendations());
  } catch (err) {
    return authErrorResponse(err);
  }
}
