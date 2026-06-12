import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { listIngredients, getLowStockIngredients } from '@/lib/services/inventory';

export async function GET(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
  const { searchParams } = new URL(request.url);
  if (searchParams.get('low') === '1') {
    return NextResponse.json(getLowStockIngredients());
  }
  return NextResponse.json(listIngredients());
  } catch (err) {
    return authErrorResponse(err);
  }
}
