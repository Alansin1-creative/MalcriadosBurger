import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import {
  getDashboardMetrics,
  getSalesByDay,
  getTopProducts,
  getProfitabilityRanking,
  getSalesByDayOfWeek,
  getKitchenPrepMetrics,
} from '@/lib/services/reports';

export async function GET() {
  ensureInitialized();
  try {
    await requireAdmin();
    return NextResponse.json({
    metrics: getDashboardMetrics(),
    salesByDay: getSalesByDay(14),
    topProducts: getTopProducts(8),
    profitability: getProfitabilityRanking(),
    salesByDayOfWeek: getSalesByDayOfWeek(),
    prepMetrics: getKitchenPrepMetrics(),
  });
  } catch (err) {
    return authErrorResponse(err);
  }
}
