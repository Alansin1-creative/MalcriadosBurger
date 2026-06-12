'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { BusinessStatusToggle } from '@/components/BusinessStatusToggle';
import Link from 'next/link';

interface Metrics {
  todaySales: number;
  todayOrders: number;
  weekSales: number;
  salesChangePercent: number;
  openOrders: number;
  lowStockCount: number;
  avgPrepSecondsToday: number | null;
  prepOrdersToday: number;
}

function formatPrepTime(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m} min`;
}

interface Recommendation {
  type: string;
  priority: string;
  title: string;
  description: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d) => setMetrics(d.metrics));
    fetch('/api/ai/recommendations')
      .then((r) => r.json())
      .then(setRecs);
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        emoji="🏪"
        title="Malcriados Burger & Dogos"
        subtitle="Tu fonda en un solo lugar — ventas, cocina e inventario"
      />

      <BusinessStatusToggle />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas hoy"
          value={metrics ? `$${metrics.todaySales.toFixed(0)}` : '—'}
          sub={metrics ? `${metrics.todayOrders} pedidos` : ''}
          accent="mustard"
        />
        <StatCard
          label="Ventas semana"
          value={metrics ? `$${metrics.weekSales.toFixed(0)}` : '—'}
          sub={
            metrics
              ? `${metrics.salesChangePercent >= 0 ? '+' : ''}${metrics.salesChangePercent}% vs sem. anterior`
              : ''
          }
          accent="ketchup"
        />
        <StatCard
          label="Tiempo en cocina"
          value={metrics ? formatPrepTime(metrics.avgPrepSecondsToday) : '—'}
          sub={
            metrics && metrics.prepOrdersToday > 0
              ? `Promedio hoy (${metrics.prepOrdersToday} pedidos)`
              : 'Promedio hoy'
          }
          accent="cream"
        />
        <StatCard
          label="Despensa baja"
          value={metrics ? String(metrics.lowStockCount) : '—'}
          sub="Ingredientes bajo mínimo"
          accent="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="food-panel p-5">
          <h2 className="font-display font-semibold text-cream">Recomendaciones del día</h2>
          <ul className="mt-4 space-y-3">
            {recs.slice(0, 5).map((r, i) => (
              <li key={i} className="food-card p-3 text-sm">
                <span
                  className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                    r.priority === 'high'
                      ? 'bg-ketchup/30 text-cream'
                      : r.priority === 'medium'
                        ? 'bg-mustard/25 text-mustard-light'
                        : 'bg-diner-card text-food-muted'
                  }`}>
                  {r.priority}
                </span>
                <span className="font-medium text-cream">{r.title}</span>
                <p className="mt-1 text-food-muted">{r.description}</p>
              </li>
            ))}
            {!recs.length && <p className="text-food-muted">Cargando recomendaciones...</p>}
          </ul>
          <Link href="/asistente" className="mt-4 inline-block text-sm text-mustard hover:underline">
            Hablar con el asistente →
          </Link>
        </section>

        <section className="food-panel p-5">
          <h2 className="font-display font-semibold text-cream">Accesos rápidos</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { href: '/pos', label: '🛒 Tomar pedido', primary: true },
              { href: '/caja', label: '💵 Caja' },
              { href: '/cocina', label: '🔥 Cocina' },
              { href: '/mesas', label: '🪑 Mesas' },
              { href: '/inventario', label: '📦 Despensa' },
              { href: '/ocr', label: '🧾 Escanear ticket' },
              { href: '/reportes', label: '📊 Ventas' },
              { href: '/recetas', label: '👨‍🍳 Recetas' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.primary
                    ? 'btn-food px-4 py-3 text-center text-sm font-semibold'
                    : 'food-card food-card-interactive px-4 py-3 text-center text-sm font-medium text-cream hover:border-mustard'
                }>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
