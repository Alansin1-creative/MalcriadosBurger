'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, RefreshCw } from 'lucide-react';
import { PaymentReceiptModal } from '@/components/PaymentReceiptModal';
import { PageHeader } from '@/components/PageHeader';
import type { SalesReceipt } from '@/lib/receipt/sales-receipt';
import type { Order, OrderLine, OrderStatus } from '@/lib/types';

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  open: 'Nuevo',
  preparing: 'En cocina',
  served: 'Listo',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function orderLabel(order: Order): string {
  if (order.order_type === 'online') {
    const who = order.user_name?.trim() || order.user_email || 'En línea';
    if (order.service_mode === 'takeaway') return `${who} · Para llevar`;
    if (order.table_name) return `${who} · ${order.table_name}`;
    if (order.service_mode === 'dine_in') return `${who} · En local`;
    return who;
  }
  if (order.table_name) return order.table_name;
  return 'Mostrador';
}

export default function CajaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');
  const [paidReceipt, setPaidReceipt] = useState<SalesReceipt | null>(null);

  const loadOrders = useCallback(() => {
    fetch('/api/orders?payable=1')
      .then((r) => r.json())
      .then((data: Order[]) => {
        setOrders(data);
        setLoading(false);
        setSelectedId((current) => {
          if (current && data.some((o) => o.id === current)) return current;
          return data[0]?.id ?? null;
        });
      })
      .catch(() => {
        setOrders([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadOrders();
    const refresh = setInterval(loadOrders, 8000);
    return () => clearInterval(refresh);
  }, [loadOrders]);

  useEffect(() => {
    if (!selectedId) {
      setLines([]);
      return;
    }
    fetch(`/api/orders/${selectedId}`)
      .then((r) => r.json())
      .then(setLines)
      .catch(() => setLines([]));
  }, [selectedId]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const linesSubtotal = lines.reduce((sum, line) => sum + line.line_total, 0);

  async function pay() {
    if (!selectedId) return;
    setPaying(true);
    setMessage('');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay', orderId: selectedId }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setMessage(data.message || 'Error al cobrar');
      return;
    }
    if (data.receipt) {
      setPaidReceipt(data.receipt as SalesReceipt);
    }
    setMessage(`Pedido #${selectedId} cobrado. Ticket generado.`);
    setSelectedId(null);
    loadOrders();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="💵"
        title="Caja"
        subtitle="Cobra pedidos del POS, cocina y clientes en línea"
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="food-badge flex items-center gap-1.5">
          <Banknote size={14} className="text-mustard" />
          {orders.length} por cobrar
        </span>
        <button type="button" onClick={loadOrders} className="btn-food-outline px-3 py-1.5 text-xs">
          <RefreshCw size={12} className="mr-1 inline" />
          Actualizar
        </button>
      </div>

      {message && <div className="food-alert px-4 py-2 text-sm">{message}</div>}

      {loading ? (
        <p className="text-food-muted">Cargando cuentas…</p>
      ) : !orders.length ? (
        <div className="food-panel flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl">💵</span>
          <p className="font-display mt-4 text-xl font-semibold text-cream">Sin cuentas pendientes</p>
          <p className="mt-1 text-sm text-food-muted">
            Aparecen aquí los pedidos guardados desde POS o enviados por clientes
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
          <div className="space-y-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-food-muted">
              Selecciona una cuenta
            </p>
            {orders.map((order) => {
              const active = order.id === selectedId;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`caja-order-card w-full rounded-xl border p-4 text-left transition-all ${
                    active
                      ? 'caja-order-card--active'
                      : 'border-food-border bg-diner-card/90 hover:border-mustard/40'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display truncate font-bold text-cream">
                        #{order.id} · {orderLabel(order)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="food-badge text-[10px]">{STATUS_LABEL[order.status] ?? order.status}</span>
                        {order.order_type === 'online' && (
                          <span className="food-badge text-[10px]">📱 En línea</span>
                        )}
                        {order.service_mode === 'takeaway' && (
                          <span className="food-badge text-[10px]">🥡 Para llevar</span>
                        )}
                        {order.service_mode === 'dine_in' && (
                          <span className="food-badge text-[10px]">
                            🪑 {order.table_name ?? 'En local'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="caja-amount shrink-0 text-lg">{formatMoney(order.total)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="caja-detail food-panel lg:sticky lg:top-4">
            {selected ? (
              <div className="flex min-h-[20rem] flex-col p-5 sm:p-6">
                <header className="border-b border-food-border/60 pb-4">
                  <h2 className="font-display flex items-center gap-2 text-xl font-bold text-cream">
                    <span aria-hidden>🧾</span> Cuenta #{selected.id}
                  </h2>
                  <p className="mt-1 text-sm text-food-muted">
                    {orderLabel(selected)} · {STATUS_LABEL[selected.status] ?? selected.status}
                  </p>
                </header>

                <div className="flex-1 py-4">
                  {lines.length ? (
                    <ul className="caja-lines space-y-3">
                      {lines.map((line) => (
                        <li key={line.id} className="caja-line">
                          <span className="min-w-0 text-sm text-cream/90">
                            <span className="font-semibold text-mustard">{line.quantity}×</span>{' '}
                            {line.display_name?.trim() || line.product_name}
                          </span>
                          <span className="caja-amount">{formatMoney(line.line_total)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-food-muted">Sin platillos</p>
                  )}
                </div>

                <footer className="mt-auto border-t border-dashed border-food-border pt-4">
                  {lines.length > 0 && Math.abs(linesSubtotal - selected.total) > 0.01 && (
                    <div className="caja-line mb-2 text-xs text-food-muted">
                      <span>Subtotal líneas</span>
                      <span className="caja-amount text-food-muted">{formatMoney(linesSubtotal)}</span>
                    </div>
                  )}
                  <div className="caja-line caja-line--total">
                    <span className="font-display text-lg font-bold text-cream">Total a cobrar</span>
                    <span className="caja-amount caja-amount--total">{formatMoney(selected.total)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={pay}
                    disabled={paying || !lines.length}
                    className="btn-food mt-5 w-full py-3 text-sm disabled:opacity-40">
                    {paying ? 'Cobrando…' : 'Cobrar y descontar inventario'}
                  </button>
                </footer>
              </div>
            ) : (
              <div className="flex min-h-[12rem] items-center justify-center p-6">
                <p className="text-food-muted">Elige un pedido de la lista</p>
              </div>
            )}
          </div>
        </div>
      )}

      {paidReceipt && (
        <PaymentReceiptModal receipt={paidReceipt} onClose={() => setPaidReceipt(null)} />
      )}
    </div>
  );
}
