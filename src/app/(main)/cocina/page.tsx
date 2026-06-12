'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Flame, RotateCcw, Timer } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import type { Order, OrderLine, OrderStatus } from '@/lib/types';

type KitchenOrder = Order & { lines: OrderLine[] };

const COLUMNS: { status: OrderStatus; label: string; emoji: string; accent: string }[] = [
  { status: 'open', label: 'Nuevos', emoji: '🔔', accent: 'border-ketchup/60 bg-ketchup/10' },
  {
    status: 'preparing',
    label: 'En cocina',
    emoji: '🔥',
    accent: 'border-mustard/60 bg-mustard/10',
  },
  {
    status: 'served',
    label: 'Listos',
    emoji: '✅',
    accent: 'border-emerald-600/50 bg-emerald-900/20',
  },
];

function elapsedSeconds(from: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs ? `${mins}m ${secs}s` : `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function prepStartAt(order: KitchenOrder): string {
  return order.preparing_at || order.created_at;
}

function orderTimeLabel(order: KitchenOrder, status: OrderStatus): string {
  if (status === 'open') {
    const secs = elapsedSeconds(order.created_at);
    if (secs < 60) return 'Recién llegado';
    return `En espera · ${formatDuration(secs)}`;
  }
  if (status === 'preparing') {
    const secs = elapsedSeconds(prepStartAt(order));
    if (secs < 5) return 'Empezando…';
    return formatDuration(secs);
  }
  if (order.prep_seconds != null) {
    return `Listo en ${formatDuration(order.prep_seconds)}`;
  }
  return 'Listo';
}

function orderTimeUrgent(order: KitchenOrder, status: OrderStatus): boolean {
  if (status === 'open') return elapsedSeconds(order.created_at) >= 900;
  if (status === 'preparing') return elapsedSeconds(prepStartAt(order)) >= 900;
  return false;
}

function orderLabel(order: KitchenOrder): string {
  if (order.order_type === 'online') {
    const who = order.user_name?.trim() || order.user_email || 'Cliente';
    if (order.service_mode === 'takeaway') return `${who} · Para llevar`;
    if (order.table_name) return `${who} · ${order.table_name}`;
    if (order.service_mode === 'dine_in') return `${who} · En local`;
    return who;
  }
  if (order.table_name) return order.table_name;
  return 'Mostrador';
}

export default function CocinaPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [, setTick] = useState(0);

  const load = useCallback(() => {
    fetch('/api/kitchen')
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => {
        setOrders([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 8000);
    const tick = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [load]);

  async function setStatus(orderId: number, status: OrderStatus) {
    setUpdatingId(orderId);
    setMessage('');
    const res = await fetch('/api/kitchen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    });
    const data = await res.json();
    setUpdatingId(null);
    if (!res.ok) {
      setMessage(data.message || 'No se pudo actualizar');
      return;
    }
    load();
  }

  const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

  const pendingCount = byStatus('open').length;
  const preparingCount = byStatus('preparing').length;

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="👨‍🍳"
        title="Cocina"
        subtitle="Pedidos de caja y de clientes en línea — el cronómetro arranca al pulsar Empezar"
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="food-badge flex items-center gap-1.5">
          <Flame size={14} className="text-mustard" />
          {pendingCount} por empezar
        </span>
        <span className="food-badge flex items-center gap-1.5">
          <Timer size={14} className="text-mustard" />
          {preparingCount} en preparación
        </span>
        <button type="button" onClick={load} className="btn-food-outline px-3 py-1.5 text-xs">
          Actualizar ahora
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-ketchup/40 bg-ketchup/15 px-4 py-2 text-sm text-cream">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-food-muted">Cargando pedidos…</p>
      ) : !orders.length ? (
        <div className="food-panel flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl">🍳</span>
          <p className="font-display mt-4 text-xl font-semibold text-cream">Sin pedidos activos</p>
          <p className="mt-1 text-sm text-food-muted">
            Aparecen cuando la caja guarda un pedido o un cliente envía desde «Hacer pedido»
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {COLUMNS.map(({ status, label, emoji, accent }) => {
            const columnOrders = byStatus(status);
            return (
              <section key={status} className="flex min-h-[320px] flex-col">
                <header
                  className={`mb-3 flex items-center justify-between rounded-xl border-2 px-4 py-3 ${accent}`}>
                  <h2 className="font-display flex items-center gap-2 text-lg font-bold text-cream">
                    <span>{emoji}</span>
                    {label}
                  </h2>
                  <span className="rounded-full bg-diner-bg/60 px-2.5 py-0.5 text-sm font-semibold text-mustard-light">
                    {columnOrders.length}
                  </span>
                </header>

                <div className="flex flex-1 flex-col gap-3">
                  {columnOrders.map((order) => {
                    const urgent = orderTimeUrgent(order, status);
                    const timeLabel = orderTimeLabel(order, status);
                    const showTimer = status === 'preparing';
                    return (
                      <article
                        key={order.id}
                        className={`food-panel border-2 p-4 ${
                          urgent ? 'border-ketchup/70 shadow-[0_0_20px_rgba(214,40,40,0.15)]' : ''
                        }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-lg font-bold text-cream">
                              #{order.id} · {orderLabel(order)}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {order.order_type === 'online' && (
                                <span className="food-badge inline-block text-[10px]">📱 En línea</span>
                              )}
                              {order.service_mode === 'takeaway' && (
                                <span className="food-badge inline-block text-[10px]">🥡 Para llevar</span>
                              )}
                              {order.service_mode === 'dine_in' && (
                                <span className="food-badge inline-block text-[10px]">
                                  🪑 {order.table_name ?? 'En local'}
                                </span>
                              )}
                              {order.payment_method === 'cash' && (
                                <span className="food-badge inline-block text-[10px]">💵 Efectivo</span>
                              )}
                              {order.payment_method === 'online' && (
                                <span className="food-badge inline-block text-[10px]">
                                  {order.payment_status === 'paid' ? '✅ Pagado MP' : '⏳ MP pendiente'}
                                </span>
                              )}
                            </div>
                            <p
                              className={`mt-0.5 flex items-center gap-1 text-xs ${
                                urgent
                                  ? 'font-semibold text-ketchup'
                                  : showTimer
                                    ? 'font-semibold text-mustard-light'
                                    : 'text-food-muted'
                              }`}>
                              {showTimer ? <Timer size={12} /> : <Clock size={12} />}
                              {timeLabel}
                            </p>
                          </div>
                          <span className="food-price text-base">${order.total.toFixed(0)}</span>
                        </div>

                        <ul className="mt-3 space-y-2 border-t border-dashed border-food-border pt-3">
                          {order.lines.map((line) => (
                            <li key={line.id} className="flex gap-2 text-sm">
                              <span className="font-display shrink-0 font-bold text-mustard">
                                {line.quantity}×
                              </span>
                              <span className="text-cream">
                                {line.display_name?.trim() || line.product_name}
                                {line.category && (
                                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-food-muted">
                                    {line.category}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                          {!order.lines.length && (
                            <li className="text-sm text-food-muted">Sin platillos</li>
                          )}
                        </ul>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {status === 'open' && (
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => setStatus(order.id, 'preparing')}
                              className="btn-food flex-1 py-2.5 text-sm disabled:opacity-50">
                              <Flame size={16} className="mr-1.5 inline" />
                              Empezar
                            </button>
                          )}
                          {status === 'preparing' && (
                            <>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => setStatus(order.id, 'served')}
                                className="btn-food flex-1 py-2.5 text-sm disabled:opacity-50">
                                <Check size={16} className="mr-1.5 inline" />
                                Listo
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === order.id}
                                onClick={() => setStatus(order.id, 'open')}
                                className="btn-food-outline px-3 py-2.5 text-sm disabled:opacity-50"
                                title="Regresar a cola">
                                <RotateCcw size={16} />
                              </button>
                            </>
                          )}
                          {status === 'served' && (
                            <button
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => setStatus(order.id, 'preparing')}
                              className="btn-food-outline w-full py-2 text-sm disabled:opacity-50">
                              <RotateCcw size={14} className="mr-1.5 inline" />
                              Volver a cocina
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}

                  {!columnOrders.length && (
                    <div className="food-card flex flex-1 items-center justify-center p-6 text-center text-sm text-food-muted">
                      Nada aquí por ahora
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
