'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ChefHat, Clock, Package, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useRequireAuth } from '@/contexts/AuthContext';
import { listMyOrdersWithLines } from '@/lib/firebase/orders';
import type { Order, OrderLine, OrderStatus } from '@/lib/types';

type OrderWithLines = Order & { lines?: OrderLine[] };

const ACTIVE_STATUSES: OrderStatus[] = ['open', 'preparing', 'served'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function prepElapsedSeconds(preparingAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(preparingAt).getTime()) / 1000));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins}m ${secs}s` : `${mins} min`;
}

type Step = {
  key: string;
  label: string;
  detail: string;
  icon: typeof Clock;
  done: boolean;
  current: boolean;
};

function buildSteps(order: Order): Step[] {
  const inKitchen = Boolean(order.preparing_at);
  const isReady = Boolean(order.served_at) || order.status === 'served';
  const isPaid = order.status === 'paid';

  return [
    {
      key: 'received',
      label: 'Pedido recibido',
      detail: formatDateTime(order.created_at),
      icon: Receipt,
      done: true,
      current: order.status === 'open' && !inKitchen,
    },
    {
      key: 'preparing',
      label: 'En cocina',
      detail: inKitchen
        ? `Empezó a las ${formatTime(order.preparing_at!)}`
        : 'Esperando que cocina lo tome',
      icon: ChefHat,
      done: inKitchen,
      current: order.status === 'preparing' || (order.status === 'open' && inKitchen),
    },
    {
      key: 'ready',
      label: 'Listo para recoger',
      detail: isReady
        ? order.served_at
          ? `Listo desde las ${formatTime(order.served_at)}`
          : 'Tu pedido está listo'
        : 'Te avisaremos cuando esté',
      icon: Package,
      done: isReady,
      current: order.status === 'served',
    },
    {
      key: 'paid',
      label: 'Pagado',
      detail:
        isPaid && order.paid_at
          ? formatDateTime(order.paid_at)
          : order.payment_status === 'paid'
            ? 'Pagado en línea'
            : order.payment_method === 'online'
              ? 'Pago en línea pendiente'
              : 'Paga en efectivo al recoger',
      icon: Check,
      done: isPaid,
      current: false,
    },
  ];
}

function statusHeadline(order: Order): { text: string; tone: 'muted' | 'warm' | 'success' | 'done' } {
  switch (order.status) {
    case 'open':
      return order.preparing_at
        ? { text: 'En cocina', tone: 'warm' }
        : { text: 'En cola — cocina lo tomará pronto', tone: 'muted' };
    case 'preparing':
      return { text: 'Se está preparando tu pedido', tone: 'warm' };
    case 'served':
      return order.payment_status === 'paid'
        ? { text: '¡Listo! Pasa a mostrador a recoger', tone: 'success' }
        : { text: '¡Listo! Pasa a mostrador a pagar y recoger', tone: 'success' };
    case 'paid':
      return { text: 'Pedido completado', tone: 'done' };
    case 'cancelled':
      return { text: 'Pedido cancelado', tone: 'muted' };
    default:
      return { text: order.status, tone: 'muted' };
  }
}

const TONE_CLASS = {
  muted: 'border-food-border bg-diner-card text-food-muted',
  warm: 'border-mustard/50 bg-mustard/10 text-mustard-light',
  success: 'border-emerald-600/50 bg-emerald-900/25 text-emerald-300',
  done: 'border-food-border bg-diner-card text-cream/80',
};

function OrderTracker({ order }: { order: Order }) {
  const [, setTick] = useState(0);
  const steps = buildSteps(order);
  const headline = statusHeadline(order);
  const showLiveTimer = order.status === 'preparing' && order.preparing_at;

  useEffect(() => {
    if (!showLiveTimer) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [showLiveTimer]);

  return (
    <div className="mt-4 space-y-4">
      <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${TONE_CLASS[headline.tone]}`}>
        {headline.text}
        {showLiveTimer && (
          <span className="ml-2 text-xs opacity-90">
            · {formatDuration(prepElapsedSeconds(order.preparing_at!))} en cocina
          </span>
        )}
      </div>

      {order.status !== 'cancelled' && (
        <ol className="space-y-0">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                      step.done
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : step.current
                          ? 'border-mustard bg-mustard/20 text-mustard-light'
                          : 'border-food-border bg-diner-bg text-food-muted'
                    }`}>
                    <Icon size={14} />
                  </span>
                  {!isLast && (
                    <span
                      className={`my-1 w-0.5 flex-1 min-h-[1.25rem] ${
                        step.done ? 'bg-emerald-600/50' : 'bg-food-border'
                      }`}
                    />
                  )}
                </div>
                <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                  <p
                    className={`text-sm font-semibold ${
                      step.current ? 'text-mustard-light' : step.done ? 'text-cream' : 'text-food-muted'
                    }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-food-muted">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function MisPedidosPageContent() {
  const { user } = useRequireAuth();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMessage, setPaymentMessage] = useState('');

  const load = useCallback(() => {
    if (!user?.uid) return;
    listMyOrdersWithLines(user.uid)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 10000);
    return () => clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    const pago = searchParams.get('pago');
    const pedido = searchParams.get('pedido');
    if (!pago || !pedido) return;

    if (pago === 'ok') {
      setPaymentMessage('Gracias. Revisa el estado de tu pedido abajo.');
      load();
    } else if (pago === 'error') {
      setPaymentMessage('El pago no se completó. Intenta de nuevo desde Hacer pedido.');
    } else if (pago === 'pendiente') {
      setPaymentMessage('Pago pendiente de confirmación en Mercado Pago.');
    }

    window.history.replaceState({}, '', '/mis-pedidos');
  }, [searchParams, load]);

  const hasActive = orders.some((o) => ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📋"
        title="Mis pedidos"
        subtitle={
          hasActive
            ? 'Seguimiento en vivo — se actualiza cada 10 segundos'
            : 'Historial de tus pedidos en Malcriados'
        }
      />

      {paymentMessage && (
        <div className="rounded-lg border border-mustard/50 bg-mustard/10 px-4 py-3 text-sm text-cream">
          {paymentMessage}
        </div>
      )}

      {loading && <p className="text-food-muted">Cargando…</p>}

      {!loading && orders.length === 0 && (
        <div className="food-panel p-6 text-center text-food-muted">
          Aún no tienes pedidos.{' '}
          <a href="/pedir" className="text-mustard hover:underline">
            Haz tu primer pedido
          </a>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="food-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-cream">Pedido #{order.id}</h2>
                <p className="text-xs text-food-muted">{formatDateTime(order.created_at)}</p>
              </div>
              <span className="food-price text-lg">${order.total.toFixed(2)}</span>
            </div>

            {order.lines && order.lines.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-dashed border-food-border pt-3 text-sm">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-2 text-cream/90">
                    <span>
                      {line.quantity}× {line.display_name?.trim() || line.product_name}
                    </span>
                    <span className="shrink-0 text-food-muted">${line.line_total.toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            )}

            <OrderTracker order={order} />
          </article>
        ))}
      </div>
    </div>
  );
}

export default function MisPedidosPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-food-muted">Cargando…</div>}>
      <MisPedidosPageContent />
    </Suspense>
  );
}
