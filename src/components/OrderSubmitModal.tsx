'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Banknote, CreditCard, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { PaymentMethod, ServiceMode } from '@/lib/types';

interface SeatOption {
  id: number;
  name: string;
  capacity: number;
  status: string;
  zone: string;
}

export type OrderSubmitPayload = {
  serviceMode: ServiceMode;
  tableId: number | null;
  paymentMethod: PaymentMethod;
};

interface OrderSubmitModalProps {
  open: boolean;
  submitting: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (payload: OrderSubmitPayload) => void;
}

function seatSubtitle(seat: SeatOption): string {
  if (seat.zone === 'Barra') return '1 persona';
  return `Hasta ${seat.capacity} personas`;
}

const STATUS_LABEL: Record<string, string> = {
  free: 'Libre',
  occupied: 'Ocupado',
  reserved: 'Reservado',
  billing: 'Por liberar',
};

export function OrderSubmitModal({
  open,
  submitting,
  total,
  onClose,
  onConfirm,
}: OrderSubmitModalProps) {
  const [step, setStep] = useState<'mode' | 'seat' | 'payment'>('mode');
  const [serviceMode, setServiceMode] = useState<ServiceMode>('takeaway');
  const [seats, setSeats] = useState<SeatOption[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const [mpAvailable, setMpAvailable] = useState<boolean | null>(null);
  const [mpMode, setMpMode] = useState<'api' | 'link' | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('mode');
      setServiceMode('takeaway');
      setSeats([]);
      setSeatError('');
      setSelectedSeatId(null);
      setMpAvailable(null);
      setMpMode(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== 'payment') return;
    fetch('/api/payments/mercadopago')
      .then((r) => r.json())
      .then((d) => {
        setMpAvailable(Boolean(d.configured));
        setMpMode(d.mode === 'api' || d.mode === 'link' ? d.mode : null);
      })
      .catch(() => {
        setMpAvailable(false);
        setMpMode(null);
      });
  }, [open, step]);

  async function chooseDineIn() {
    setLoadingSeats(true);
    setSeatError('');
    try {
      const res = await fetch('/api/local/disponibilidad');
      const data = await res.json();
      if (!res.ok) throw new Error('No se pudo cargar la disponibilidad');

      const list: SeatOption[] = data.seats ?? [];
      const freeSeats = list.filter((s) => s.status === 'free');

      if (freeSeats.length === 0) {
        setSeatError('No hay asientos libres en el local. Elige para llevar o intenta más tarde.');
        setLoadingSeats(false);
        return;
      }

      setServiceMode('dine_in');
      setSeats(list);
      setStep('seat');
    } catch {
      setSeatError('No se pudo verificar los asientos');
    } finally {
      setLoadingSeats(false);
    }
  }

  function goToPayment(mode: ServiceMode, tableId: number | null) {
    setServiceMode(mode);
    setSelectedSeatId(tableId);
    setStep('payment');
  }

  if (!open) return null;

  const salon = seats.filter((s) => s.zone === 'Salón');
  const barra = seats.filter((s) => s.zone === 'Barra');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-submit-title">
      <div className="food-panel w-full max-w-md space-y-4 p-6 shadow-2xl">
        {step === 'mode' && (
          <>
            <h2 id="order-submit-title" className="font-display text-lg font-bold text-cream">
              ¿Cómo lo quieres?
            </h2>
            <p className="text-sm text-food-muted">
              Elige si recoges tu pedido o te quedas a comer en el local.
            </p>
            {seatError && (
              <p className="rounded-lg border border-ketchup/40 bg-ketchup/15 px-3 py-2 text-sm text-cream">
                {seatError}
              </p>
            )}
            <div className="grid gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => goToPayment('takeaway', null)}
                className="food-card-interactive flex items-center gap-3 rounded-xl border-2 border-food-border px-4 py-4 text-left transition hover:border-mustard/50 disabled:opacity-50">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-diner-surface text-mustard">
                  <ShoppingBag size={22} />
                </span>
                <span>
                  <span className="font-display block font-bold text-cream">Para llevar</span>
                  <span className="text-xs text-food-muted">Recoges en mostrador</span>
                </span>
              </button>
              <button
                type="button"
                disabled={submitting || loadingSeats}
                onClick={() => void chooseDineIn()}
                className="food-card-interactive flex items-center gap-3 rounded-xl border-2 border-emerald-600/40 bg-emerald-900/15 px-4 py-4 text-left transition hover:border-emerald-500/60 disabled:opacity-50">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-diner-surface text-emerald-400">
                  <UtensilsCrossed size={22} />
                </span>
                <span>
                  <span className="font-display block font-bold text-cream">Comer en el local</span>
                  <span className="text-xs text-food-muted">
                    {loadingSeats ? 'Cargando asientos…' : 'Elige tu mesa o banco'}
                  </span>
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-2 text-sm text-food-muted hover:text-cream disabled:opacity-50">
              Seguir editando
            </button>
          </>
        )}

        {step === 'seat' && (
          <>
            <button
              type="button"
              onClick={() => {
                setStep('mode');
                setSeatError('');
                setSelectedSeatId(null);
              }}
              disabled={submitting}
              className="flex items-center gap-1 text-sm text-food-muted hover:text-cream disabled:opacity-50">
              <ArrowLeft size={16} /> Volver
            </button>
            <h2 className="font-display text-lg font-bold text-cream">Elige tu asiento</h2>
            <p className="text-sm text-food-muted">
              Toca un asiento libre. Los ocupados no se pueden seleccionar.
            </p>
            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              {salon.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-food-muted">
                    Salón
                  </p>
                  <div className="grid gap-2">
                    {salon.map((seat) => {
                      const available = seat.status === 'free';
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedSeatId(seat.id)}
                          className={`local-seat text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            available
                              ? selectedSeatId === seat.id
                                ? 'local-seat--free ring-2 ring-emerald-400'
                                : 'local-seat--free'
                              : 'local-seat--busy'
                          }`}>
                          <div>
                            <p className="font-display font-bold text-cream">{seat.name}</p>
                            <p className="text-xs text-food-muted">{seatSubtitle(seat)}</p>
                          </div>
                          <span className="local-seat-badge">
                            {STATUS_LABEL[seat.status] ?? seat.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {barra.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-food-muted">
                    Barra
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {barra.map((seat) => {
                      const available = seat.status === 'free';
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedSeatId(seat.id)}
                          className={`local-seat text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            available
                              ? selectedSeatId === seat.id
                                ? 'local-seat--free ring-2 ring-emerald-400'
                                : 'local-seat--free'
                              : 'local-seat--busy'
                          }`}>
                          <div>
                            <p className="font-display font-bold text-cream">{seat.name}</p>
                            <p className="text-xs text-food-muted">1 persona</p>
                          </div>
                          <span className="local-seat-badge">
                            {STATUS_LABEL[seat.status] ?? seat.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={submitting || selectedSeatId === null}
              onClick={() => goToPayment('dine_in', selectedSeatId)}
              className="btn-food w-full py-2.5 text-sm disabled:opacity-40">
              Elegir método de pago
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-2 text-sm text-food-muted hover:text-cream disabled:opacity-50">
              Seguir editando
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <button
              type="button"
              onClick={() => setStep(serviceMode === 'dine_in' ? 'seat' : 'mode')}
              disabled={submitting}
              className="flex items-center gap-1 text-sm text-food-muted hover:text-cream disabled:opacity-50">
              <ArrowLeft size={16} /> Volver
            </button>
            <h2 className="font-display text-lg font-bold text-cream">Método de pago</h2>
            <div className="rounded-xl border border-mustard/40 bg-mustard/10 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-food-muted">Total a pagar</p>
              <p className="font-display text-2xl font-bold text-mustard">${total.toFixed(2)}</p>
            </div>
            <p className="text-sm text-food-muted">
              {serviceMode === 'takeaway'
                ? 'Para llevar — el cobro confirma tu pedido en cocina.'
                : 'En el local — pagas ahora y enviamos tu pedido a cocina.'}
            </p>
            <div className="grid gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  onConfirm({
                    serviceMode,
                    tableId: serviceMode === 'dine_in' ? selectedSeatId : null,
                    paymentMethod: 'cash',
                  })
                }
                className="food-card-interactive flex items-center gap-3 rounded-xl border-2 border-food-border px-4 py-4 text-left transition hover:border-mustard/50 disabled:opacity-50">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-diner-surface text-mustard">
                  <Banknote size={22} />
                </span>
                <span>
                  <span className="font-display block font-bold text-cream">Efectivo</span>
                  <span className="text-xs text-food-muted">Pagas en mostrador al recoger</span>
                </span>
              </button>
              <button
                type="button"
                disabled={submitting || mpAvailable === false}
                onClick={() =>
                  onConfirm({
                    serviceMode,
                    tableId: serviceMode === 'dine_in' ? selectedSeatId : null,
                    paymentMethod: 'online',
                  })
                }
                className="food-card-interactive flex items-center gap-3 rounded-xl border-2 border-sky-600/40 bg-sky-900/15 px-4 py-4 text-left transition hover:border-sky-500/60 disabled:opacity-50">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-diner-surface text-sky-300">
                  <CreditCard size={22} />
                </span>
                <span>
                  <span className="font-display block font-bold text-cream">Pago en línea</span>
                  <span className="text-xs text-food-muted">
                    {mpAvailable === false
                      ? 'Requiere Access Token en el servidor (Fly secrets)'
                      : 'Mercado Pago — se abre en otra pestaña con el total del pedido'}
                  </span>
                </span>
              </button>
            </div>
            {mpAvailable !== false && (
              <p className="rounded-lg border border-sky-600/25 bg-sky-950/30 px-3 py-2 text-xs leading-relaxed text-food-muted">
                Si el checkout de Mercado Pago se queda cargando: prueba en ventana de incógnito, desactiva
                bloqueadores de anuncios y no pagues con la misma cuenta del vendedor.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full py-2 text-sm text-food-muted hover:text-cream disabled:opacity-50">
              Seguir editando
            </button>
          </>
        )}
      </div>
    </div>
  );
}
