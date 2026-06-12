import { getDb } from '../db';

export function getDashboardMetrics() {
  const db = getDb();

  const todaySales = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as orders
       FROM orders WHERE status = 'paid' AND date(created_at) = date('now')`
    )
    .get() as { total: number; orders: number };

  const weekSales = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM orders WHERE status = 'paid' AND created_at >= datetime('now', '-7 days')`
    )
    .get() as { total: number };

  const lastWeekSales = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) as total
       FROM orders WHERE status = 'paid'
       AND created_at >= datetime('now', '-14 days')
       AND created_at < datetime('now', '-7 days')`
    )
    .get() as { total: number };

  const openOrders = db
    .prepare("SELECT COUNT(*) as c FROM orders WHERE status IN ('open', 'preparing', 'served')")
    .get() as { c: number };

  const lowStock = db
    .prepare('SELECT COUNT(*) as c FROM ingredients WHERE current_stock <= min_stock')
    .get() as { c: number };

  const prepToday = db
    .prepare(
      `SELECT AVG(prep_seconds) as avg_seconds, COUNT(*) as count
       FROM orders WHERE prep_seconds IS NOT NULL AND date(served_at) = date('now')`
    )
    .get() as { avg_seconds: number | null; count: number };

  const salesChange =
    lastWeekSales.total > 0
      ? ((weekSales.total - lastWeekSales.total) / lastWeekSales.total) * 100
      : 0;

  return {
    todaySales: todaySales.total,
    todayOrders: todaySales.orders,
    weekSales: weekSales.total,
    salesChangePercent: Math.round(salesChange * 10) / 10,
    openOrders: openOrders.c,
    lowStockCount: lowStock.c,
    avgPrepSecondsToday: prepToday.avg_seconds ? Math.round(prepToday.avg_seconds) : null,
    prepOrdersToday: prepToday.count,
  };
}

export function getSalesByDay(days = 14) {
  const db = getDb();
  return db
    .prepare(
      `SELECT date(created_at) as date,
              SUM(total) as sales,
              COUNT(*) as orders
       FROM orders WHERE status = 'paid'
       AND created_at >= datetime('now', ? || ' days')
       GROUP BY date(created_at)
       ORDER BY date`
    )
    .all(`-${days}`) as { date: string; sales: number; orders: number }[];
}

export function getTopProducts(limit = 5) {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.id, p.name, p.category, p.price, p.cost,
              SUM(ol.quantity) as units,
              SUM(ol.line_total) as revenue,
              SUM(ol.quantity * p.cost) as cost_total
       FROM order_lines ol
       JOIN orders o ON o.id = ol.order_id
       JOIN products p ON p.id = ol.product_id
       WHERE o.status = 'paid' AND o.created_at >= datetime('now', '-30 days')
       GROUP BY p.id
       ORDER BY revenue DESC
       LIMIT ?`
    )
    .all(limit) as {
    id: number;
    name: string;
    category: string;
    price: number;
    cost: number;
    units: number;
    revenue: number;
    cost_total: number;
  }[];
}

export function getProfitabilityRanking() {
  const products = getTopProducts(20);
  return products
    .map((p) => ({
      ...p,
      margin: p.revenue > 0 ? ((p.revenue - p.cost_total) / p.revenue) * 100 : 0,
      profit: p.revenue - p.cost_total,
    }))
    .sort((a, b) => b.profit - a.profit);
}

export function getSalesByDayOfWeek() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT CAST(strftime('%w', created_at) AS INTEGER) as dow,
              AVG(total) as avg_sale,
              COUNT(*) as orders
       FROM orders WHERE status = 'paid'
       AND created_at >= datetime('now', '-60 days')
       GROUP BY dow`
    )
    .all() as { dow: number; avg_sale: number; orders: number }[];

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return rows.map((r) => ({
    day: days[r.dow],
    avgSale: Math.round(r.avg_sale),
    orders: r.orders,
  }));
}

export function getKitchenPrepMetrics() {
  const db = getDb();

  const today = db
    .prepare(
      `SELECT COUNT(*) as count,
              AVG(prep_seconds) as avg_seconds,
              MIN(prep_seconds) as min_seconds,
              MAX(prep_seconds) as max_seconds
       FROM orders
       WHERE prep_seconds IS NOT NULL AND date(served_at) = date('now')`
    )
    .get() as {
    count: number;
    avg_seconds: number | null;
    min_seconds: number | null;
    max_seconds: number | null;
  };

  const week = db
    .prepare(
      `SELECT COUNT(*) as count, AVG(prep_seconds) as avg_seconds
       FROM orders
       WHERE prep_seconds IS NOT NULL AND served_at >= datetime('now', '-7 days')`
    )
    .get() as { count: number; avg_seconds: number | null };

  const byDay = db
    .prepare(
      `SELECT date(served_at) as date,
              AVG(prep_seconds) as avg_seconds,
              COUNT(*) as orders
       FROM orders
       WHERE prep_seconds IS NOT NULL AND served_at >= datetime('now', '-14 days')
       GROUP BY date(served_at)
       ORDER BY date`
    )
    .all() as { date: string; avg_seconds: number; orders: number }[];

  return {
    todayCount: today.count,
    todayAvgSeconds: today.avg_seconds ? Math.round(today.avg_seconds) : null,
    todayMinSeconds: today.min_seconds,
    todayMaxSeconds: today.max_seconds,
    weekCount: week.count,
    weekAvgSeconds: week.avg_seconds ? Math.round(week.avg_seconds) : null,
    avgByDay: byDay.map((r) => ({
      date: r.date,
      avgSeconds: Math.round(r.avg_seconds),
      orders: r.orders,
    })),
  };
}
