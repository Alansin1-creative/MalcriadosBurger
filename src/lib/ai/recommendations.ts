import { getLowStockIngredients, listIngredients } from '../services/inventory';
import { getProfitabilityRanking, getDashboardMetrics, getSalesByDay } from '../services/reports';
import { forecastIngredientConsumption, forecastProductDemand } from './forecast';
import type { Recommendation } from '../types';

export function generateRecommendations(): Recommendation[] {
  const recs: Recommendation[] = [];
  const metrics = getDashboardMetrics();
  const lowStock = getLowStockIngredients();
  const profitability = getProfitabilityRanking();
  const ingredientForecast = forecastIngredientConsumption(7);
  const productForecast = forecastProductDemand(7);
  const salesByDay = getSalesByDay(14);

  for (const ing of lowStock) {
    recs.push({
      type: 'stock_alert',
      priority: ing.current_stock < ing.min_stock * 0.5 ? 'high' : 'medium',
      title: `Stock bajo: ${ing.name}`,
      description: `Quedan ${ing.current_stock} ${ing.unit} (mínimo ${ing.min_stock}). Riesgo de desabasto.`,
      action: `Comprar al menos ${Math.ceil(ing.min_stock * 2 - ing.current_stock)} ${ing.unit}`,
    });
  }

  for (const fc of ingredientForecast.filter((i) => i.deficit > 0).slice(0, 5)) {
    recs.push({
      type: 'purchase',
      priority: fc.deficit > fc.current * 0.5 ? 'high' : 'medium',
      title: `Compra sugerida: ${fc.name}`,
      description: `Demanda prevista en 7 días: ${fc.needed.toFixed(1)} ${fc.unit}. Stock actual: ${fc.current.toFixed(1)}.`,
      action: `Comprar ~${Math.ceil(fc.deficit)} ${fc.unit}`,
    });
  }

  if (profitability.length > 0) {
    const top = profitability[0];
    recs.push({
      type: 'profitability',
      priority: 'medium',
      title: `Producto más rentable: ${top.name}`,
      description: `Margen estimado ${top.margin.toFixed(1)}% con $${top.profit.toFixed(0)} de utilidad en 30 días.`,
      action: 'Promover en menú y capacitar al personal para sugerirlo',
    });

    const bottom = profitability[profitability.length - 1];
    if (bottom.margin < 30) {
      recs.push({
        type: 'profitability',
        priority: 'low',
        title: `Baja rentabilidad: ${bottom.name}`,
        description: `Margen ${bottom.margin.toFixed(1)}%. Revisa costos de ingredientes o ajusta precio.`,
        action: 'Revisar receta y proveedores',
      });
    }
  }

  const rising = productForecast.filter((p) => p.trend === 'up').slice(0, 2);
  for (const p of rising) {
    recs.push({
      type: 'trend',
      priority: 'medium',
      title: `Tendencia al alza: ${p.productName}`,
      description: `Demanda prevista: ${p.predictedUnits} unidades en 7 días. Asegura inventario de ingredientes.`,
    });
  }

  if (metrics.salesChangePercent < -5) {
    recs.push({
      type: 'revenue',
      priority: 'high',
      title: 'Ventas en descenso',
      description: `Las ventas de la semana bajaron ${Math.abs(metrics.salesChangePercent)}% vs la semana anterior.`,
      action: 'Revisa horarios pico, promociones y tiempos de servicio',
    });
  } else if (metrics.salesChangePercent > 8) {
    recs.push({
      type: 'revenue',
      priority: 'low',
      title: 'Ventas en crecimiento',
      description: `Subieron ${metrics.salesChangePercent}% esta semana. Considera reforzar inventario.`,
    });
  }

  const ingredients = listIngredients();
  const wasteCandidates = ingredients.filter(
    (i) => i.current_stock > i.min_stock * 3 && i.unit_cost > 20
  );
  for (const w of wasteCandidates.slice(0, 2)) {
    recs.push({
      type: 'waste',
      priority: 'medium',
      title: `Posible sobreinventario: ${w.name}`,
      description: `Stock ${w.current_stock} ${w.unit} (${(w.current_stock / w.min_stock).toFixed(1)}x el mínimo). Riesgo de merma.`,
      action: 'Crear promoción o ajustar compras',
    });
  }

  if (salesByDay.length >= 7) {
    const last3 = salesByDay.slice(-3).reduce((s, d) => s + d.sales, 0) / 3;
    const prev3 = salesByDay.slice(-7, -4).reduce((s, d) => s + d.sales, 0) / 3;
    if (prev3 > 0 && last3 < prev3 * 0.8) {
      recs.push({
        type: 'revenue',
        priority: 'high',
        title: 'Caída reciente de ventas diarias',
        description: `Promedio últimos 3 días ($${last3.toFixed(0)}) vs 3 días previos ($${prev3.toFixed(0)}).`,
        action: 'Analiza clima, eventos locales y menú del día',
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
