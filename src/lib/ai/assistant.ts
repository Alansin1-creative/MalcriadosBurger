import { getLowStockIngredients, listIngredients } from '../services/inventory';
import {
  getDashboardMetrics,
  getProfitabilityRanking,
  getSalesByDay,
  getTopProducts,
} from '../services/reports';
import { forecastSales, forecastProductDemand, forecastIngredientConsumption } from './forecast';
import { generateRecommendations } from './recommendations';

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function answerQuestion(question: string): string {
  const q = normalize(question);
  const metrics = getDashboardMetrics();
  const recommendations = generateRecommendations();

  if (
    q.includes('comprar') &&
    (q.includes('manana') || q.includes('mañana') || q.includes('proxim') || q.includes('semana'))
  ) {
    const purchases = recommendations.filter((r) => r.type === 'purchase' || r.type === 'stock_alert');
    if (purchases.length === 0) {
      return 'Según el inventario actual, no hay compras urgentes para mañana. Revisa el pronóstico semanal en Reportes.';
    }
    const list = purchases
      .slice(0, 6)
      .map((p) => `• **${p.title}**: ${p.description}${p.action ? ` → ${p.action}` : ''}`)
      .join('\n');
    return `**Compras recomendadas para los próximos días:**\n\n${list}\n\nEstas sugerencias combinan stock actual, mínimos y demanda prevista.`;
  }

  if (q.includes('rentab') || q.includes('gananc') || q.includes('utilidad') || q.includes('mas rentable')) {
    const ranking = getProfitabilityRanking();
    if (ranking.length === 0) return 'Aún no hay datos de ventas para calcular rentabilidad.';
    const top = ranking[0];
    const bottom = ranking[ranking.length - 1];
    return `**Producto más rentable (30 días):** ${top.name}\n• Ingresos: $${top.revenue.toFixed(0)}\n• Utilidad estimada: $${top.profit.toFixed(0)} (${top.margin.toFixed(1)}% margen)\n\n**Menor rentabilidad:** ${bottom.name} (${bottom.margin.toFixed(1)}% margen).\n\nTip: promueve ${top.name} y revisa costos de ${bottom.name}.`;
  }

  if (q.includes('baj') && (q.includes('venta') || q.includes('vend'))) {
    const sales = getSalesByDay(14);
    const metrics2 = getDashboardMetrics();
    const reasons: string[] = [];

    if (metrics2.salesChangePercent < 0) {
      reasons.push(
        `Ventas semanales bajaron **${Math.abs(metrics2.salesChangePercent)}%** vs la semana anterior.`
      );
    } else {
      reasons.push('Las ventas semanales no muestran caída fuerte vs la semana pasada.');
    }

    if (sales.length >= 4) {
      const recent = sales.slice(-3).reduce((s, d) => s + d.sales, 0) / 3;
      const before = sales.slice(0, 3).reduce((s, d) => s + d.sales, 0) / 3;
      if (recent < before * 0.9) {
        reasons.push(`Promedio diario reciente ($${recent.toFixed(0)}) menor que inicio del periodo ($${before.toFixed(0)}).`);
      }
    }

    const lowStock = getLowStockIngredients();
    if (lowStock.length > 2) {
      reasons.push(`${lowStock.length} ingredientes con stock bajo pueden limitar el menú.`);
    }

    const top = getTopProducts(3);
  const declining = forecastProductDemand(7).filter((p) => p.trend === 'down');
    if (declining.length) {
      reasons.push(`Productos con tendencia a la baja: ${declining.map((d) => d.productName).join(', ')}.`);
    }

    return `**Análisis de ventas:**\n\n${reasons.map((r) => `• ${r}`).join('\n')}\n\n**Top productos recientes:** ${top.map((t) => t.name).join(', ')}.\n\nRevisa también clima, eventos locales y tiempos de servicio en horas pico.`;
  }

  if (q.includes('agot') || q.includes('stock') || q.includes('inventario') || q.includes('quedan')) {
    const low = getLowStockIngredients();
    if (low.length === 0) {
      return 'Todos los ingredientes están por encima del stock mínimo. ✅';
    }
    const list = low
      .map(
        (i) =>
          `• **${i.name}**: ${i.current_stock} ${i.unit} (mín. ${i.min_stock}) — proveedor: ${i.supplier || 'N/D'}`
      )
      .join('\n');
    return `**Ingredientes por agotarse o bajo mínimo:**\n\n${list}`;
  }

  if (q.includes('pronostic') || q.includes('predic') || q.includes('futur') || q.includes('demanda')) {
    const sales = forecastSales(7);
    const products = forecastProductDemand(7).slice(0, 5);
    const salesText = sales
      .map((s) => `• ${s.dayOfWeek} ${s.date}: ~$${s.predictedSales} (${(s.confidence * 100).toFixed(0)}% conf.)`)
      .join('\n');
    const prodText = products.map((p) => `• ${p.productName}: ~${p.predictedUnits} uds (${p.trend})`).join('\n');
    return `**Pronóstico próximos 7 días:**\n\n*Ventas estimadas:*\n${salesText}\n\n*Demanda por producto:*\n${prodText}`;
  }

  if (q.includes('recomend') || q.includes('suger') || q.includes('que hago')) {
    const top = recommendations.slice(0, 5);
    if (!top.length) return 'No hay recomendaciones urgentes en este momento.';
    return `**Recomendaciones prioritarias:**\n\n${top.map((r) => `• [${r.priority.toUpperCase()}] **${r.title}**: ${r.description}`).join('\n')}`;
  }

  if (q.includes('venta') && (q.includes('hoy') || q.includes('dia'))) {
    return `**Hoy:** $${metrics.todaySales.toFixed(2)} en ${metrics.todayOrders} pedidos pagados.\n**Semana:** $${metrics.weekSales.toFixed(2)} (${metrics.salesChangePercent >= 0 ? '+' : ''}${metrics.salesChangePercent}% vs semana anterior).`;
  }

  if (q.includes('mesa') || q.includes('pedido')) {
    return `Hay **${metrics.openOrders}** pedidos abiertos. Revisa Mesas, POS o Caja para gestionarlos.`;
  }

  if (q.includes('ingrediente') || q.includes('receta')) {
    const ings = listIngredients();
    const consumption = forecastIngredientConsumption(7).slice(0, 5);
    const consText = consumption
      .map((c) => `• ${c.name}: consumo previsto ${c.needed.toFixed(1)} ${c.unit}, stock ${c.current.toFixed(1)}`)
      .join('\n');
    return `Tienes **${ings.length}** ingredientes registrados.\n\n**Consumo previsto (7 días):**\n${consText}`;
  }

  return `Soy el asistente de **Plan AI**. Puedo ayudarte con:\n\n• ¿Qué debo comprar mañana?\n• ¿Cuál es mi producto más rentable?\n• ¿Por qué bajaron mis ventas?\n• ¿Qué productos están por agotarse?\n• Pronósticos y recomendaciones\n\n**Resumen rápido:** Ventas hoy $${metrics.todaySales.toFixed(0)} | ${metrics.lowStockCount} alertas de stock | ${metrics.openOrders} pedidos abiertos.`;
}
