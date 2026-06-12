'use client';

import { useCallback, useEffect, useState } from 'react';
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  BURGER_CATEGORY_NOTE,
  HOT_DOG_CATEGORY_NOTE,
  TACOS_CATEGORY_NOTE,
  TORTAS_CATEGORY_NOTE,
} from '@/lib/data/malcriados-menu';
import {
  cartItemKey,
  isCustomizableProduct,
  type ModifiersPayload,
} from '@/lib/data/product-modifiers';
import { apiLinesToSyncLines, type OrderCartLine } from '@/lib/order-cart';
import { useOrderAutoSave } from '@/hooks/useOrderAutoSave';
import { ProductModifierModal } from '@/components/ProductModifierModal';
import { PageHeader } from '@/components/PageHeader';
import { BusinessStatusToggle } from '@/components/BusinessStatusToggle';
import { isPublicMenuProduct } from '@/lib/data/malcriados-menu';

interface Product {
  id: number;
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  description?: string;
}

interface Table {
  id: number;
  name: string;
  status: string;
}

interface OpenOrder {
  id: number;
  table_id: number | null;
  status: string;
  total: number;
  table_name?: string;
}

interface CartItem {
  key: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  displayName: string;
  modifiers: ModifiersPayload;
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [tableId, setTableId] = useState<number | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [editingCartKey, setEditingCartKey] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<{
    quantity: number;
    modifiers: ModifiersPayload;
  } | null>(null);

  const refreshOpenOrders = useCallback(() => {
    fetch('/api/orders?status=open')
      .then((r) => r.json())
      .then(setOpenOrders)
      .catch(() => setOpenOrders([]));
  }, []);

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts);
    fetch('/api/tables').then((r) => r.json()).then(setTables);
    refreshOpenOrders();
  }, [refreshOpenOrders]);

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const total = subtotal;

  const editingCartItem = editingCartKey ? cart.find((c) => c.key === editingCartKey) : null;

  function cartToLines(items: CartItem[]): OrderCartLine[] {
    return items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      displayName: item.displayName,
      modifiers: item.modifiers,
    }));
  }

  function linesToCart(syncLines: OrderCartLine[], catalog: Product[]): CartItem[] {
    const items: CartItem[] = [];
    for (const line of syncLines) {
      const product = catalog.find((p) => p.id === line.productId);
      if (!product) continue;
      items.push({
        key: cartItemKey(product.id, line.modifiers),
        product,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        displayName: line.displayName || product.name,
        modifiers: line.modifiers,
      });
    }
    return items;
  }

  const {
    setBaseline,
    hasSessionChanges,
    saveStatus,
    saveError,
    confirmBeforeLeave,
    leaveModal,
  } = useOrderAutoSave({
    orderId,
    lines: cartToLines(cart),
    onRevert: (restored: OrderCartLine[]) => {
      setCart(linesToCart(restored, products));
      setMessage('Pedido restaurado al estado anterior');
      refreshOpenOrders();
    },
  });

  async function startOrder() {
    if (orderId && hasSessionChanges) {
      const ok = await confirmBeforeLeave();
      if (!ok) return;
    }
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', tableId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message || 'No se pudo crear el pedido');
      return;
    }
    setOrderId(data.orderId);
    setCart([]);
    setBaseline([]);
    setMessage(`Pedido #${data.orderId} creado — elige platillos del menú`);
    refreshOpenOrders();
    fetch('/api/tables').then((r) => r.json()).then(setTables);
  }

  async function loadOrder(id: number) {
    if (orderId && orderId !== id) {
      const ok = await confirmBeforeLeave();
      if (!ok) return;
    }

    let catalog = products;
    if (!catalog.length) {
      catalog = await fetch('/api/products').then((r) => r.json());
      setProducts(catalog);
    }

    const [lines, orders] = await Promise.all([
      fetch(`/api/orders/${id}`).then((r) => r.json()),
      fetch('/api/orders?status=open').then((r) => r.json()),
    ]);
    const order = orders.find((o: OpenOrder) => o.id === id);
    if (!order) {
      setMessage('Ese pedido ya no está abierto');
      refreshOpenOrders();
      return;
    }

    const syncLines = apiLinesToSyncLines(lines);
    const items = linesToCart(syncLines, catalog);

    setOrderId(id);
    setTableId(order.table_id);
    setCart(items);
    setBaseline(syncLines);
    setMessage(`Pedido #${id} cargado — los cambios se guardan solos`);
    fetch('/api/tables').then((r) => r.json()).then(setTables);
  }

  function handleProductClick(product: Product) {
    if (!orderId) {
      setMessage('Primero crea o abre un pedido');
      return;
    }
    setEditingCartKey(null);
    setEditInitial(null);
    setCustomizing(product);
  }

  function openEditCartItem(item: CartItem) {
    setEditingCartKey(item.key);
    setEditInitial({ quantity: item.quantity, modifiers: item.modifiers });
    setCustomizing(item.product);
  }

  function upsertCartItem(item: Omit<CartItem, 'key'>, replaceKey?: string | null) {
    const key = cartItemKey(item.product.id, item.modifiers);
    setCart((prev) => {
      const without = replaceKey ? prev.filter((c) => c.key !== replaceKey) : prev;
      const existing = without.find((c) => c.key === key);
      if (existing && replaceKey !== key) {
        return without.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + item.quantity } : c
        );
      }
      if (existing && replaceKey === key) {
        return without.map((c) =>
          c.key === key
            ? {
                ...c,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                displayName: item.displayName,
                modifiers: item.modifiers,
              }
            : c
        );
      }
      return [...without, { ...item, key }];
    });
  }

  function setCartItemQuantity(key: string, quantity: number) {
    if (quantity <= 0) {
      removeCartItem(key);
      return;
    }
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, quantity } : c)));
  }

  function removeCartItem(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key));
    setMessage('Línea eliminada del pedido');
  }

  const menuProducts = products.filter((p) => isPublicMenuProduct(p.name));
  const categories = [...new Set(menuProducts.map((p) => p.category))].filter((c) => c !== 'Extras');

  const saveLabel =
    saveStatus === 'saving'
      ? 'Guardando…'
      : saveStatus === 'error'
        ? 'Error al guardar'
        : hasSessionChanges
          ? 'Cambios pendientes…'
          : orderId
            ? 'Guardado'
            : '';

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🛒"
        title="POS — tomar pedido"
        subtitle="Arma el pedido y personaliza platillos; el cobro se hace en Caja"
      />

      <BusinessStatusToggle compact />

      {message && <div className="food-alert px-4 py-2 text-sm">{message}</div>}

      <div className="food-panel space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={tableId ?? ''}
            onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : null)}
            className="food-input text-sm">
            <option value="">Mostrador (sin mesa)</option>
            {tables
              .filter((t) => t.status === 'free' || t.id === tableId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.status}
                </option>
              ))}
          </select>
          <button onClick={startOrder} className="btn-food px-4 py-2 text-sm">
            Nuevo pedido
          </button>
          {orderId && (
            <span className="food-badge self-center">
              Pedido activo #{orderId}
              {saveLabel && ` · ${saveLabel}`}
            </span>
          )}
        </div>

        {openOrders.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-food-muted">Pedidos abiertos (modificar)</p>
            <div className="flex flex-wrap gap-2">
              {openOrders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => loadOrder(o.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    orderId === o.id
                      ? 'border-mustard bg-mustard/20 text-mustard-light'
                      : 'border-food-border bg-diner-card text-cream/90 hover:border-mustard'
                  }`}>
                  #{o.id}
                  {o.table_name ? ` · ${o.table_name}` : ' · mostrador'} — ${o.total.toFixed(0)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="order-2 space-y-8 lg:order-1 lg:col-span-2">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="food-category-title mb-2">
                {cat === 'Hot dogs'
                  ? '🌭 Dogos'
                  : cat === 'Hamburguesas'
                    ? '🍔 '
                    : cat === 'Tacos'
                      ? '🌮 '
                      : cat === 'Tortas'
                        ? '🥖 '
                        : cat === 'Papas y Aros'
                          ? '🍟 '
                          : ''}
                {cat}
              </h2>
              {cat === 'Hot dogs' && <p className="food-note mb-3">{HOT_DOG_CATEGORY_NOTE}</p>}
              {cat === 'Hamburguesas' && <p className="food-note mb-3">{BURGER_CATEGORY_NOTE}</p>}
              {cat === 'Tacos' && <p className="food-note mb-3">{TACOS_CATEGORY_NOTE}</p>}
              {cat === 'Tortas' && <p className="food-note mb-3">{TORTAS_CATEGORY_NOTE}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {menuProducts
                  .filter((p) => p.category === cat)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      className="food-menu-item food-card-interactive px-4 py-3 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-display font-semibold text-cream">
                            {p.name}
                            {isCustomizableProduct(p.category) && (
                              <span className="food-badge ml-1.5">✎ extras</span>
                            )}
                          </span>
                          {p.subtitle && <p className="food-subtitle mt-0.5">{p.subtitle}</p>}
                        </div>
                        <span className="food-price shrink-0 text-lg">
                          ${p.price}
                          {p.category === 'Tacos' && (
                            <span className="block text-right text-[10px] font-normal text-food-muted">
                              / 4 pzas
                            </span>
                          )}
                        </span>
                      </div>
                      {p.description && (
                        <p className="mt-1.5 text-xs leading-snug text-food-muted">{p.description}</p>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="food-cart order-1 p-4 sm:p-5 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-cream">
            <span>🧾</span> Tu pedido
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.map((c) => (
              <li key={c.key} className="food-card px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCartItem(c)}
                    className="min-w-0 flex-1 text-left text-cream/90 hover:text-mustard-light">
                    <span className="font-medium">
                      {c.quantity}× {c.displayName}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-food-muted">
                      <Pencil size={10} /> tocar para modificar
                    </span>
                  </button>
                  <span className="food-price shrink-0">${(c.unitPrice * c.quantity).toFixed(0)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(c.key, c.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-food-border text-mustard hover:border-mustard">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-xs font-semibold text-cream">{c.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(c.key, c.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-food-border text-mustard hover:border-mustard">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCartItem(c.key)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-ketchup hover:bg-ketchup/15">
                    <Trash2 size={14} />
                    Quitar
                  </button>
                </div>
              </li>
            ))}
            {!cart.length && <li className="text-food-muted">Sin platillos aún…</li>}
          </ul>
          <div className="mt-4 space-y-1 border-t border-food-border border-dashed pt-4 text-sm">
            <div className="font-display flex justify-between text-xl font-bold text-mustard">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          {orderId && (
            <p className="mt-4 text-xs text-food-muted">
              Los cambios se guardan automáticamente. Al salir del pedido puedes mantenerlos o
              descartarlos.
              {saveError && <span className="mt-1 block text-ketchup-light">{saveError}</span>}
            </p>
          )}
        </div>
      </div>

      {leaveModal}

      {customizing && (
        <ProductModifierModal
          key={`${customizing.id}-${editingCartKey ?? 'new'}`}
          product={customizing}
          editing={Boolean(editingCartKey)}
          initialQuantity={editInitial?.quantity ?? editingCartItem?.quantity ?? 1}
          initialModifiers={editInitial?.modifiers ?? editingCartItem?.modifiers}
          onClose={() => {
            setCustomizing(null);
            setEditingCartKey(null);
            setEditInitial(null);
          }}
          onConfirm={(item) => {
            upsertCartItem(
              {
                product: customizing,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                displayName: item.displayName,
                modifiers: item.modifiers,
              },
              editingCartKey
            );
            setCustomizing(null);
            setEditingCartKey(null);
            setEditInitial(null);
            setMessage(
              editingCartKey
                ? `${item.displayName} actualizada — $${item.unitPrice * item.quantity}`
                : `${item.quantity > 1 ? `${item.quantity}× ` : ''}${item.displayName} agregada — $${item.unitPrice * item.quantity}`
            );
          }}
        />
      )}
    </div>
  );
}
