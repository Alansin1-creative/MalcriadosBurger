'use client';

import { useCallback, useEffect, useState } from 'react';
import { Power } from 'lucide-react';

type Props = {
  compact?: boolean;
};

export function BusinessStatusToggle({ compact = false }: Props) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch('/api/restaurant/status')
      .then((r) => r.json())
      .then((d) => {
        setIsOpen(d.isOpen);
        setUpdatedAt(d.updatedAt);
      })
      .catch(() => setIsOpen(true));
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 15000);
    return () => clearInterval(refresh);
  }, [load]);

  async function toggle() {
    if (isOpen === null || saving) return;
    setSaving(true);
    setError('');
    const next = !isOpen;
    const res = await fetch('/api/restaurant/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: next }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.message || 'No se pudo actualizar');
      return;
    }
    setIsOpen(data.isOpen);
    setUpdatedAt(data.updatedAt);
  }

  if (isOpen === null) {
    return <p className="text-sm text-food-muted">Cargando estado del local…</p>;
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
          isOpen
            ? 'border-emerald-500/50 bg-emerald-900/25 text-emerald-300'
            : 'border-ketchup/50 bg-ketchup/20 text-cream'
        }`}>
        <Power size={14} />
        {saving ? '…' : isOpen ? 'Abierto' : 'Cerrado'}
      </button>
    );
  }

  return (
    <section
      className={`food-panel border-2 p-5 sm:p-6 ${
        isOpen ? 'border-emerald-600/40' : 'border-ketchup/50'
      }`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-food-muted">
            Estado del negocio
          </p>
          <h2 className="font-display mt-1 flex items-center gap-2 text-2xl font-bold text-cream">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                isOpen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-ketchup'
              }`}
            />
            {isOpen ? 'Abierto — tomando pedidos' : 'Cerrado — sin pedidos ni lugar'}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-food-muted">
            {isOpen
              ? 'Los clientes pueden pedir en línea y ver mesas o bancos libres en /local.'
              : 'No se aceptan pedidos nuevos. En /local todo aparece sin disponibilidad.'}
          </p>
          {updatedAt && (
            <p className="mt-1 text-[10px] text-food-muted">Último cambio: {updatedAt}</p>
          )}
        </div>

        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`btn-food flex items-center gap-2 px-5 py-3 text-sm disabled:opacity-50 ${
            !isOpen ? 'bg-gradient-to-b from-emerald-600 to-emerald-800' : ''
          }`}>
          <Power size={18} />
          {saving ? 'Guardando…' : isOpen ? 'Cerrar negocio' : 'Abrir negocio'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-ketchup">{error}</p>}
    </section>
  );
}
