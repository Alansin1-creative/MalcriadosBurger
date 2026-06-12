'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { BusinessStatusToggle } from '@/components/BusinessStatusToggle';
import { LocalAvailabilityQr } from '@/components/LocalAvailabilityQr';

interface Table {
  id: number;
  name: string;
  capacity: number;
  status: string;
  zone: string;
}

const statusColors: Record<string, string> = {
  free: 'border-mustard/50 bg-mustard/10 text-mustard-light',
  occupied: 'border-ketchup/50 bg-ketchup/15 text-cream',
  reserved: 'border-food-border bg-diner-card text-food-muted',
  billing: 'border-mustard-light/60 bg-ketchup/25 text-mustard-light',
};

const statusLabels: Record<string, string> = {
  free: 'Libre',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  billing: 'Por cobrar',
};

function seatSubtitle(t: Table): string {
  if (t.zone === 'Barra') return 'Barra · 1 persona';
  return `${t.zone} · hasta ${t.capacity} personas`;
}

export default function MesasPage() {
  const [tables, setTables] = useState<Table[]>([]);

  const load = useCallback(() => {
    fetch('/api/tables')
      .then((r) => r.json())
      .then(setTables);
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 8000);
    return () => clearInterval(refresh);
  }, [load]);

  async function setStatus(id: number, status: string) {
    await fetch('/api/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const byZone = useMemo(() => {
    const zones = ['Salón', 'Barra'] as const;
    return zones.map((zone) => ({
      zone,
      items: tables.filter((t) => t.zone === zone),
    }));
  }, [tables]);

  const freeCount = tables.filter((t) => t.status === 'free').length;

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🪑"
        title="Mesas y barra"
        subtitle="1 mesa + 4 bancos — marca libre u ocupado para que los clientes vean lugar en /local"
      />

      <BusinessStatusToggle />

      <div className="flex flex-wrap items-center gap-3">
        <span className="food-badge">
          {freeCount} de {tables.length} libres
        </span>
        <a href="/local" target="_blank" rel="noreferrer" className="btn-food-outline px-3 py-1.5 text-xs">
          Ver como cliente ↗
        </a>
      </div>

      <LocalAvailabilityQr />

      {byZone.map(({ zone, items }) =>
        items.length ? (
          <section key={zone}>
            <h2 className="food-category-title mb-4">{zone === 'Barra' ? '🍺 Barra' : '🪑 Salón'}</h2>
            <div className={`grid gap-4 ${zone === 'Barra' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'max-w-md'}`}>
              {items.map((t) => (
                <div
                  key={t.id}
                  className={`food-panel border-2 p-5 ${statusColors[t.status] || 'border-food-border'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-bold text-cream">{t.name}</h3>
                      <p className="text-sm opacity-80">{seatSubtitle(t)}</p>
                    </div>
                    <span className="food-badge shrink-0">{statusLabels[t.status] || t.status}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus(t.id, 'free')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        t.status === 'free'
                          ? 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500'
                          : 'bg-diner-bg/50 text-food-muted hover:bg-emerald-900/20 hover:text-emerald-200'
                      }`}>
                      Libre
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(t.id, 'occupied')}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        t.status === 'occupied'
                          ? 'bg-ketchup/30 text-cream ring-1 ring-ketchup'
                          : 'bg-diner-bg/50 text-food-muted hover:bg-ketchup/15 hover:text-cream'
                      }`}>
                      Ocupado
                    </button>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-[10px] text-food-muted hover:text-cream">
                      Más estados
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['reserved', 'billing'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(t.id, s)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                            t.status === s
                              ? 'bg-mustard/30 text-cream ring-1 ring-mustard'
                              : 'bg-diner-bg/50 text-food-muted hover:bg-diner-card'
                          }`}>
                          {statusLabels[s]}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
