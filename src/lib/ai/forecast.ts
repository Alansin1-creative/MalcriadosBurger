import { getDb } from '../db';
import type { ForecastPoint, ProductForecast } from '../types';
import { addDays, format, getDay } from 'date-fns';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function forecastSales(daysAhead = 7): ForecastPoint[] {
  const db = getDb();
  const history = db
    .prepare(
      `SELECT date(created_at) as d,
              CAST(strftime('%w', created_at) AS INTEGER) as dow,
              SUM(total) as sales
       FROM orders WHERE status = 'paid'
       AND created_at >= datetime('now', '-90 days')
       GROUP BY d`
    )
    .all() as { d: string; dow: number; sales: number }[];

  const byDow: Record<number, number[]> = {};
  for (const h of history) {
    if (!byDow[h.dow]) byDow[h.dow] = [];
    byDow[h.dow].push(h.sales);
  }

  const dowAvg: Record<number, number> = {};
  for (const [dow, vals] of Object.entries(byDow)) {
    dowAvg[Number(dow)] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const overallAvg =
    history.length > 0
      ? history.reduce((s, h) => s + h.sales, 0) / history.length
      : 1500;

  const recent = history.slice(-7);
  const recentAvg =
    recent.length > 0 ? recent.reduce((s, h) => s + h.sales, 0) / recent.length : overallAvg;
  const trendFactor = overallAvg > 0 ? recentAvg / overallAvg : 1;

  const points: ForecastPoint[] = [];
  const today = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const date = addDays(today, i);
    const dow = getDay(date);
    const base = dowAvg[dow] ?? overallAvg;
    const seasonalBoost = dow === 5 || dow === 6 ? 1.12 : dow === 1 ? 0.92 : 1;
    const predicted = Math.round(base * trendFactor * seasonalBoost);
    const variance = byDow[dow]?.length ?? 1;
    const confidence = Math.min(0.95, 0.55 + variance * 0.04);

    points.push({
      date: format(date, 'yyyy-MM-dd'),
      predictedSales: predicted,
      dayOfWeek: DAY_NAMES[dow],
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  return points;
}

export function forecastProductDemand(daysAhead = 7): ProductForecast[] {
  const db = getDb();
  const products = db
    .prepare(
      `SELECT p.id, p.name,
              SUM(ol.quantity) as units_30d,
              SUM(CASE WHEN o.created_at >= datetime('now', '-7 days') THEN ol.quantity ELSE 0 END) as units_7d
       FROM products p
       LEFT JOIN order_lines ol ON ol.product_id = p.id
       LEFT JOIN orders o ON o.id = ol.order_id AND o.status = 'paid'
       WHERE p.active = 1
       GROUP BY p.id`
    )
    .all() as { id: number; name: string; units_30d: number; units_7d: number }[];

  const daysInPeriod = 30;
  const forecastDays = daysAhead;

  return products
    .map((p) => {
      const dailyAvg = (p.units_30d || 0) / daysInPeriod;
      const recentDaily = (p.units_7d || 0) / 7;
      const blended = dailyAvg * 0.4 + recentDaily * 0.6;
      const predictedUnits = Math.max(0, Math.round(blended * forecastDays));
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentDaily > dailyAvg * 1.15) trend = 'up';
      else if (recentDaily < dailyAvg * 0.85) trend = 'down';

      return {
        productId: p.id,
        productName: p.name,
        predictedUnits,
        trend,
      };
    })
    .sort((a, b) => b.predictedUnits - a.predictedUnits);
}

export function forecastIngredientConsumption(daysAhead = 7) {
  const db = getDb();
  const productForecast = forecastProductDemand(daysAhead);
  const forecastMap = Object.fromEntries(productForecast.map((p) => [p.productId, p.predictedUnits]));

  const recipes = db
    .prepare(
      `SELECT rl.product_id, rl.ingredient_id, rl.quantity, i.name, i.unit, i.current_stock
       FROM recipe_lines rl
       JOIN ingredients i ON i.id = rl.ingredient_id`
    )
    .all() as {
    product_id: number;
    ingredient_id: number;
    quantity: number;
    name: string;
    unit: string;
    current_stock: number;
  }[];

  const consumption: Record<
    number,
    { name: string; unit: string; needed: number; current: number }
  > = {};

  for (const r of recipes) {
    const units = forecastMap[r.product_id] || 0;
    const needed = r.quantity * units;
    if (!consumption[r.ingredient_id]) {
      consumption[r.ingredient_id] = {
        name: r.name,
        unit: r.unit,
        needed: 0,
        current: r.current_stock,
      };
    }
    consumption[r.ingredient_id].needed += needed;
  }

  return Object.entries(consumption)
    .map(([id, data]) => ({
      ingredientId: Number(id),
      ...data,
      deficit: Math.max(0, data.needed - data.current),
    }))
    .sort((a, b) => b.deficit - a.deficit);
}
