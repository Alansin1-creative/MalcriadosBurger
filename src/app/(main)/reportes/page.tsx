'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';

const chartTooltip = {
  contentStyle: {
    background: '#2a1e14',
    border: '1px solid #5c4033',
    borderRadius: '8px',
    color: '#fff4e0',
  },
  labelStyle: { color: '#f7b538' },
};

function formatPrepTime(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m} min`;
}

export default function ReportesPage() {
  const [data, setData] = useState<{
    salesByDay: { date: string; sales: number }[];
    topProducts: { name: string; revenue: number; units: number }[];
    salesByDayOfWeek: { day: string; avgSale: number }[];
    metrics: { weekSales: number; salesChangePercent: number };
    prepMetrics: {
      todayCount: number;
      todayAvgSeconds: number | null;
      todayMinSeconds: number | null;
      todayMaxSeconds: number | null;
      weekCount: number;
      weekAvgSeconds: number | null;
      avgByDay: { date: string; avgSeconds: number; orders: number }[];
    };
  } | null>(null);
  const [forecast, setForecast] = useState<{ date: string; predictedSales: number; dayOfWeek: string }[]>([]);

  useEffect(() => {
    fetch('/api/reports').then((r) => r.json()).then(setData);
    fetch('/api/ai/forecast').then((r) => r.json()).then((d) => setForecast(d.sales));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader emoji="📊" title="Ventas y pronósticos" subtitle="Cómo va la fonda — datos e IA" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="food-panel p-5">
          <h2 className="font-display mb-4 font-semibold text-cream">Ventas últimos 14 días</h2>
          <div className="h-56 min-h-[14rem] w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data?.salesByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5c4033" />
                <XAxis dataKey="date" tick={{ fill: '#c9b89a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#c9b89a', fontSize: 10 }} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="sales" fill="#f7b538" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="food-panel p-5">
          <h2 className="font-display mb-4 font-semibold text-cream">Pronóstico (7 días)</h2>
          <div className="h-56 min-h-[14rem] w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5c4033" />
                <XAxis dataKey="dayOfWeek" tick={{ fill: '#c9b89a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#c9b89a', fontSize: 10 }} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="predictedSales" stroke="#d62828" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="food-panel p-5">
          <h2 className="font-display mb-4 font-semibold text-cream">Tiempo en cocina (hoy)</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-food-muted">Promedio</dt>
              <dd className="font-display mt-1 text-2xl font-bold text-mustard-light">
                {formatPrepTime(data?.prepMetrics?.todayAvgSeconds ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-food-muted">Pedidos medidos</dt>
              <dd className="font-display mt-1 text-2xl font-bold text-cream">
                {data?.prepMetrics?.todayCount ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-food-muted">Más rápido</dt>
              <dd className="mt-1 text-cream">
                {formatPrepTime(data?.prepMetrics?.todayMinSeconds ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-food-muted">Más lento</dt>
              <dd className="mt-1 text-cream">
                {formatPrepTime(data?.prepMetrics?.todayMaxSeconds ?? null)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-food-muted">
            Promedio semanal: {formatPrepTime(data?.prepMetrics?.weekAvgSeconds ?? null)} (
            {data?.prepMetrics?.weekCount ?? 0} pedidos)
          </p>
        </section>

        <section className="food-panel p-5">
          <h2 className="font-display mb-4 font-semibold text-cream">Tiempo cocina por día (14 días)</h2>
          <div className="h-56 min-h-[14rem] w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data?.prepMetrics?.avgByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5c4033" />
                <XAxis dataKey="date" tick={{ fill: '#c9b89a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#c9b89a', fontSize: 10 }} unit="s" />
                <Tooltip
                  {...chartTooltip}
                  formatter={(value) => [formatPrepTime(Number(value ?? 0)), 'Promedio']}
                />
                <Bar dataKey="avgSeconds" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="food-panel p-5">
          <h2 className="font-display mb-4 font-semibold text-cream">Lo más vendido (30 días)</h2>
          <ul className="space-y-2 text-sm">
            {(data?.topProducts ?? []).map((p, i) => (
              <li key={i} className="flex justify-between border-b border-food-border/50 py-2">
                <span className="text-cream">{p.name}</span>
                <span className="text-food-muted">
                  {p.units} uds · <span className="food-price">${p.revenue?.toFixed(0)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="food-panel p-5">
          <h2 className="font-display mb-4 font-semibold text-cream">Promedio por día</h2>
          <ul className="space-y-2 text-sm">
            {(data?.salesByDayOfWeek ?? []).map((d, i) => (
              <li key={i} className="flex justify-between py-1">
                <span className="text-cream/90">{d.day}</span>
                <span className="food-price">~${d.avgSale}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
