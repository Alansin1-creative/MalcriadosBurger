import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import {
  forecastSales,
  forecastProductDemand,
  forecastIngredientConsumption,
} from '@/lib/ai/forecast';

export async function GET() {
  ensureInitialized();
  try {
    await requireAdmin();
    return NextResponse.json({
      sales: forecastSales(7),
      products: forecastProductDemand(7),
      ingredients: forecastIngredientConsumption(7),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
