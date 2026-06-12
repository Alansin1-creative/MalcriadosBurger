'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import {
  MENU_CATEGORIES,
  MENU_COMBOS,
  REFRESCO_A_ELEGIR,
  comboSizeLabel,
  type ComboSize,
  type MenuCombo,
} from '@/lib/data/combos';
import { comboEstimatedTotal } from '@/lib/combo-order';
import { PageHeader } from '@/components/PageHeader';
import { useRequireAuth } from '@/contexts/AuthContext';

type Product = { id: number; name: string; price: number; category: string };

const SIZE_SECTIONS: ComboSize[] = [1, 2, '4-6'];

function ComboCard({
  combo,
  products,
  ordering,
  onOrder,
}: {
  combo: MenuCombo;
  products: Product[];
  ordering: string | null;
  onOrder: (combo: MenuCombo) => void;
}) {
  const total = comboEstimatedTotal(combo, products);
  const busy = ordering === combo.id;

  return (
    <article className="food-card flex flex-col p-4 transition hover:border-mustard/40">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-food-border bg-diner-surface text-2xl">
          {combo.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-cream">{combo.name}</h3>
          <p className="mt-0.5 text-xs text-food-muted">{combo.tagline}</p>
        </div>
        <span className="food-price shrink-0 text-lg">${total}</span>
      </div>
      <ul className="mt-3 space-y-1 border-t border-dashed border-food-border pt-3 text-xs text-food-muted">
        {combo.items.map((item) => {
          const qty = item.quantity > 1 ? `${item.quantity}× ` : '';
          const label =
            item.productName === REFRESCO_A_ELEGIR
              ? 'Refresco a elegir (Coca, Light, Elite, Manzanita)'
              : item.productName;
          return (
            <li key={`${combo.id}-${item.productName}-${item.quantity}`}>
              {qty}
              {label}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={Boolean(ordering)}
        onClick={() => onOrder(combo)}
        className="btn-food mt-4 w-full py-2 text-sm disabled:opacity-50">
        {busy ? 'Agregando…' : 'Pedir combo'}
      </button>
    </article>
  );
}

export default function InicioPage() {
  useRequireAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [restaurantOpen, setRestaurantOpen] = useState<boolean | null>(null);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
    fetch('/api/restaurant/status')
      .then((r) => r.json())
      .then((d) => setRestaurantOpen(d.isOpen))
      .catch(() => setRestaurantOpen(true));
  }, []);

  const orderCombo = useCallback(
    async (combo: MenuCombo) => {
      setMessage('');
      setOrdering(combo.id);
      try {
        sessionStorage.setItem('pendingComboId', combo.id);
        router.push('/pedir?combo=' + encodeURIComponent(combo.id));
      } catch {
        setMessage('No se pudo abrir el pedido');
      } finally {
        setOrdering(null);
      }
    },
    [router]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        centered
        emoji="🍔"
        title="¿Qué se te antoja?"
        subtitle="Combos listos o arma tu pedido por categoría"
      />

      {restaurantOpen === false && (
        <div className="rounded-lg border border-ketchup/50 bg-ketchup/15 px-4 py-3 text-center text-sm text-cream">
          <strong className="text-ketchup">Local cerrado.</strong> Los combos se pueden ver, pero no
          tomamos pedidos en línea por ahora.
        </div>
      )}

      {message && <div className="food-alert px-4 py-2 text-center text-sm">{message}</div>}

      <section>
        <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-food-muted">
          Menú por categoría
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {MENU_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/pedir?categoria=${encodeURIComponent(cat.id)}`}
              className="food-card-interactive flex flex-col items-center gap-1.5 rounded-xl border border-food-border bg-diner-card px-2 py-4 text-center transition hover:border-mustard/50 hover:bg-diner-surface">
              <span className="text-3xl sm:text-4xl">{cat.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight text-cream sm:text-xs">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-food-muted">
          O arma tu pedido platillo por platillo en{' '}
          <Link href="/pedir" className="text-mustard hover:underline">
            Hacer pedido
          </Link>
        </p>
        <Link
          href="/local"
          className="food-panel mt-4 block border-2 border-emerald-600/45 bg-emerald-900/20 px-4 py-5 text-center transition hover:border-emerald-500/65 hover:bg-emerald-900/30">
          <p className="font-display text-lg font-bold text-cream sm:text-xl">
            🪑 ¿Vienes a comer aquí?
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-400 sm:text-base">
            Ver si hay mesa o banco libre →
          </p>
        </Link>
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-center gap-2 text-mustard">
          <Sparkles size={18} />
          <h2 className="font-display text-lg font-bold text-cream">Combos listos para pedir</h2>
          <Sparkles size={18} />
        </div>

        {SIZE_SECTIONS.map((size) => {
          const combos = MENU_COMBOS.filter((c) => c.size === size);
          return (
            <div key={String(size)}>
              <h3 className="food-category-title mb-4 text-center">
                {comboSizeLabel(size)}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {combos.map((combo) => (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    products={products}
                    ordering={ordering}
                    onOrder={orderCombo}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
