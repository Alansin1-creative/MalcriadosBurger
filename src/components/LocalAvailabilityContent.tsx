'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantStatus } from '@/lib/firebase/settings';
import { listRestaurantSeating, seatingSummary } from '@/lib/firebase/tables';

interface Seat {
  id: number;
  name: string;
  capacity: number;
  status: string;
  zone: string;
}

interface AvailabilityData {
  isOpen?: boolean;
  seats: Seat[];
  availableCount: number;
  totalCount: number;
  hasTableFree: boolean;
  barStoolsFree: number;
  updatedAt?: string;
}

const STATUS_CLIENT: Record<string, { label: string; available: boolean }> = {
  free: { label: 'Libre', available: true },
  occupied: { label: 'Ocupado', available: false },
  reserved: { label: 'Reservado', available: false },
  billing: { label: 'Por liberar', available: false },
};

function seatDescription(seat: Seat): string {
  if (seat.zone === 'Barra') return 'Barra · 1 persona';
  return `${seat.zone} · hasta ${seat.capacity} personas`;
}

export function LocalAvailabilityContent() {
  const { user } = useAuth();
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { isOpen } = await getRestaurantStatus();
      const seats = await listRestaurantSeating();
      const summary = seatingSummary(seats, isOpen);
      setData({ ...summary, updatedAt: new Date().toISOString() });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 15000);
    return () => clearInterval(refresh);
  }, [load]);

  const salon = data?.seats.filter((s) => s.zone === 'Salón') ?? [];
  const barra = data?.seats.filter((s) => s.zone === 'Barra') ?? [];

  return (
    <div className="mx-auto max-w-lg">
      {user ? (
        <PageHeader
          centered
          emoji="🪑"
          title="¿Hay lugar en el local?"
          subtitle="1 mesa en salón y 4 bancos en barra · se actualiza cada 15 segundos"
        />
      ) : (
        <header className="text-center">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-mustard">
            🍔 Malcriados Burger & Dogos
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold text-cream sm:text-3xl">
            ¿Hay lugar en el local?
          </h1>
          <p className="mt-2 text-sm text-food-muted">
            1 mesa en salón y 4 bancos en barra · se actualiza cada 15 segundos
          </p>
        </header>
      )}

      {loading && !data ? (
        <p className="mt-10 text-center text-food-muted">Cargando…</p>
      ) : data ? (
        <div className="mt-8 space-y-6">
          {data.isOpen === false && (
            <div className="food-panel border-2 border-ketchup/50 bg-ketchup/15 p-5 text-center">
              <p className="font-display text-xl font-bold text-cream">Cerrado por ahora</p>
              <p className="mt-2 text-sm text-food-muted">
                No hay servicio ni lugares disponibles. Vuelve a revisar cuando abramos.
              </p>
            </div>
          )}

          <div
            className={`food-panel border-2 p-5 text-center ${
              data.isOpen === false
                ? 'border-ketchup/40 bg-ketchup/10'
                : data.availableCount > 0
                  ? 'border-emerald-600/40 bg-emerald-900/15'
                  : 'border-ketchup/40 bg-ketchup/10'
            }`}>
            <p className="font-display text-3xl font-bold text-cream">
              {data.isOpen === false ? '—' : `${data.availableCount}/${data.totalCount}`}
            </p>
            <p className="mt-1 text-sm text-food-muted">
              {data.isOpen === false ? 'local cerrado' : 'lugares libres ahora'}
            </p>
            <p className="mt-3 text-sm font-medium text-cream/90">
              {data.isOpen === false
                ? 'Malcriados no está tomando clientes en este momento'
                : data.availableCount === 0
                  ? 'Por ahora no hay lugar — vuelve a revisar en un momento'
                  : data.hasTableFree && data.barStoolsFree > 0
                    ? 'Hay mesa y bancos en barra disponibles'
                    : data.hasTableFree
                      ? 'Hay mesa disponible en el salón'
                      : `${data.barStoolsFree} banco${data.barStoolsFree === 1 ? '' : 's'} libre${data.barStoolsFree === 1 ? '' : 's'} en la barra`}
            </p>
          </div>

          {salon.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-food-muted">
                Salón
              </h2>
              <div className="grid gap-3">
                {salon.map((seat) => {
                  const info =
                    data.isOpen === false
                      ? { label: 'Cerrado', available: false }
                      : (STATUS_CLIENT[seat.status] ?? STATUS_CLIENT.occupied);
                  return (
                    <div
                      key={seat.id}
                      className={`local-seat ${info.available ? 'local-seat--free' : 'local-seat--busy'}`}>
                      <div>
                        <p className="font-display font-bold text-cream">{seat.name}</p>
                        <p className="text-xs text-food-muted">{seatDescription(seat)}</p>
                      </div>
                      <span className="local-seat-badge">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {barra.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-food-muted">
                Barra
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {barra.map((seat) => {
                  const info =
                    data.isOpen === false
                      ? { label: 'Cerrado', available: false }
                      : (STATUS_CLIENT[seat.status] ?? STATUS_CLIENT.occupied);
                  return (
                    <div
                      key={seat.id}
                      className={`local-seat ${info.available ? 'local-seat--free' : 'local-seat--busy'}`}>
                      <div>
                        <p className="font-display font-bold text-cream">{seat.name}</p>
                        <p className="text-xs text-food-muted">1 persona</p>
                      </div>
                      <span className="local-seat-badge">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <p className="mt-10 text-center text-food-muted">No se pudo cargar la disponibilidad</p>
      )}

      <div className="mt-10 flex flex-col items-center gap-3 text-sm">
        <button type="button" onClick={load} className="btn-food-outline px-4 py-2">
          <RefreshCw size={14} className="mr-1.5 inline" />
          Actualizar
        </button>
        {user?.role === 'client' && (
          <Link href="/pedir" className="text-mustard hover:underline">
            Hacer pedido en línea
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link href="/mesas" className="text-mustard hover:underline">
            Panel de mesas
          </Link>
        )}
        {!user && (
          <Link href="/login" className="text-mustard hover:underline">
            Inicia sesión para pedir en línea
          </Link>
        )}
      </div>
    </div>
  );
}
