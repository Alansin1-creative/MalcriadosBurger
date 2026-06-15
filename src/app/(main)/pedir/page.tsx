'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { apiLinesToSyncLines, syncOrderCartLines, type OrderCartLine } from '@/lib/order-cart';
import { useOrderAutoSave } from '@/hooks/useOrderAutoSave';
import type { Order, OrderLine } from '@/lib/types';
import { OrderSubmitModal, type OrderSubmitPayload } from '@/components/OrderSubmitModal';
import { ProductModifierModal } from '@/components/ProductModifierModal';
import Link from 'next/link';
import { missingOrderContactMessage } from '@/lib/auth/client-profile';
import { getComboById, MENU_CATEGORIES } from '@/lib/data/combos';
import { isPublicMenuProduct } from '@/lib/data/malcriados-menu';
import { resolveComboLines } from '@/lib/combo-order';
import { useRequireAuth } from '@/contexts/AuthContext';
import { listActiveProducts } from '@/lib/firebase/products';
import { getRestaurantStatus } from '@/lib/firebase/settings';
import {
  createOrResumeOnlineOrder,
  getActiveOnlineOrderForUser,
  getOrderLines,
  submitOnlineOrder,
} from '@/lib/firebase/orders';

interface Product {
  id: number;
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  description?: string;
}

interface CartItem {
  key: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  displayName: string;
  modifiers: ModifiersPayload;
}

function categorySectionId(category: string) {
  return `cat-${category.replace(/\s+/g, '-')}`;
}

function PedirPageContent() {
  const { user } = useRequireAuth();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [editingCartKey, setEditingCartKey] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<{
    quantity: number;
    modifiers: ModifiersPayload;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [restaurantOpen, setRestaurantOpen] = useState<boolean | null>(null);
  const [activeOrder, setActiveOrder] = useState<{
    id: number;
    status: string;
    blocksNewOrder: boolean;
    message: string | null;
  } | null>(null);
  const loadedOrderRef = useRef<number | null>(null);
  const comboAppliedRef = useRef(false);

  const profileIncomplete = user?.canOrder === false;
  const profileMessage = user
    ? missingOrderContactMessage({ email: user.email, phone: user.phone })
    : '';

  const editingOpenOrder =
    activeOrder?.status === 'open' && orderId != null && activeOrder.id === orderId;

  const orderingBlocked =
    restaurantOpen === false ||
    profileIncomplete ||
    (Boolean(activeOrder?.blocksNewOrder) && !editingOpenOrder);

  const loadActiveOrder = useCallback(() => {
    if (!user?.uid) return;
    getActiveOnlineOrderForUser(user.uid)
      .then((data) => {
        if (!data || !data.id) {
          setActiveOrder(null);
          return;
        }
        setActiveOrder({
          id: data.id,
          status: data.status,
          blocksNewOrder: Boolean(data.blocksNewOrder),
          message: data.message ?? null,
        });
        if (data.status === 'open') {
          setOrderId(data.id);
        }
      })
      .catch(() => setActiveOrder(null));
  }, [user?.uid]);

  useEffect(() => {
    listActiveProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const loadStatus = () => {
      getRestaurantStatus()
        .then((d) => setRestaurantOpen(d.isOpen))
        .catch(() => setRestaurantOpen(true));
    };
    loadStatus();
    const refresh = setInterval(loadStatus, 15000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    loadActiveOrder();
    const refresh = setInterval(loadActiveOrder, 15000);
    return () => clearInterval(refresh);
  }, [loadActiveOrder]);

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

  function linesToCart(syncLines: OrderCartLine[]): CartItem[] {
    const items: CartItem[] = [];
    for (const line of syncLines) {
      const product = products.find((p) => p.id === line.productId);
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

  const canEditOrder = Boolean(orderId) && !orderingBlocked;

  const {
    setBaseline,
    hasSessionChanges,
    saveStatus,
    saveError,
    leaveModal,
  } = useOrderAutoSave({
    orderId: canEditOrder ? orderId : null,
    lines: cartToLines(cart),
    enabled: canEditOrder,
    onRevert: (restored: OrderCartLine[]) => {
      setCart(linesToCart(restored));
      setMessage('Pedido restaurado al estado anterior');
    },
  });

  useEffect(() => {
    loadedOrderRef.current = null;
  }, [orderId]);

  useEffect(() => {
    if (!orderId || orderingBlocked || !products.length) return;
    if (loadedOrderRef.current === orderId) return;
    if (comboAppliedRef.current) return;

    let cancelled = false;
    getOrderLines(orderId)
      .then((lines) => {
        if (cancelled) return;
        const syncLines = apiLinesToSyncLines(
          lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            display_name: l.display_name,
            product_name: l.product_name,
            modifiers_json: l.modifiers_json,
          }))
        );
        const items = linesToCart(syncLines);
        setCart(items);
        setBaseline(syncLines);
        loadedOrderRef.current = orderId;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [orderId, orderingBlocked, products, setBaseline]);

  const ensureOrder = useCallback(async () => {
    if (orderId) return orderId;
    if (!user?.uid) throw new Error('Inicia sesión para pedir');
    const id = await createOrResumeOnlineOrder(user.uid);
    setOrderId(id);
    setBaseline([]);
    loadedOrderRef.current = id;
    return id;
  }, [orderId, setBaseline, user?.uid]);

  useEffect(() => {
    if (!cart.length || orderId || orderingBlocked) return;
    ensureOrder().catch((err) =>
      setMessage(err instanceof Error ? err.message : 'No se pudo crear el pedido')
    );
  }, [cart.length, orderId, orderingBlocked, ensureOrder]);

  useEffect(() => {
    if (!products.length || comboAppliedRef.current || orderingBlocked) return;
    const comboId =
      searchParams.get('combo') ?? sessionStorage.getItem('pendingComboId');
    if (!comboId) return;

    const combo = getComboById(comboId);
    if (!combo) return;

    const { lines, missing } = resolveComboLines(combo, products);
    if (missing.length) {
      setMessage(`No se pudo cargar el combo: faltan ${missing.join(', ')}`);
      comboAppliedRef.current = true;
      sessionStorage.removeItem('pendingComboId');
      return;
    }

    comboAppliedRef.current = true;
    sessionStorage.removeItem('pendingComboId');
    const items = linesToCart(lines);
    setCart(items);
    setMessage(`Combo «${combo.name}» listo — revisa y envía a cocina`);

    void (async () => {
      try {
        const id = await ensureOrder();
        await syncOrderCartLines(id, lines);
        setBaseline(lines);
        loadedOrderRef.current = id;
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error al guardar el combo');
      }
    })();

    window.history.replaceState({}, '', '/pedir');
  }, [
    products,
    searchParams,
    orderingBlocked,
    ensureOrder,
    setBaseline,
  ]);

  useEffect(() => {
    const cat = searchParams.get('categoria');
    if (!cat || !products.length) return;
    const timer = setTimeout(() => {
      document.getElementById(categorySectionId(cat))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchParams, products]);

  function handleProductClick(product: Product) {
    if (orderingBlocked) {
      setMessage(
        profileIncomplete
          ? profileMessage
          : activeOrder?.message ??
              'El negocio está cerrado. No aceptamos pedidos en línea por ahora.'
      );
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
      setCart((prev) => prev.filter((c) => c.key !== key));
      return;
    }
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, quantity } : c)));
  }

  function openSubmitModal() {
    if (orderingBlocked) {
      setMessage(
        profileIncomplete
          ? profileMessage
          : activeOrder?.message ?? 'No puedes enviar un pedido ahora.'
      );
      return;
    }
    if (!cart.length) {
      setMessage('Agrega platillos a tu pedido');
      return;
    }
    setSubmitModalOpen(true);
  }

  async function submitOrder(payload: OrderSubmitPayload) {
    setSubmitting(true);
    setMessage('');
    try {
      const id = await ensureOrder();
      const syncResult = await syncOrderCartLines(id, cartToLines(cart));
      if (!syncResult.ok) throw new Error(syncResult.message);

      await submitOnlineOrder(id, {
        serviceMode: payload.serviceMode,
        tableId: payload.tableId,
        paymentMethod: payload.paymentMethod === 'online' ? 'cash' : payload.paymentMethod,
      });

      if (payload.paymentMethod === 'online') {
        throw new Error('Pago en línea no disponible en la versión web. Elige efectivo.');
      }

      const modeNote =
        payload.serviceMode === 'takeaway'
          ? 'Para llevar — paga en efectivo al recoger.'
          : 'En el local — paga en efectivo al recoger.';

      setMessage(`¡Pedido #${id} enviado a cocina! ${modeNote}`);
      setSubmitModalOpen(false);
      setOrderId(null);
      setCart([]);
      loadedOrderRef.current = null;
      loadActiveOrder();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al enviar pedido');
    } finally {
      setSubmitting(false);
    }
  }

  const menuProducts = products.filter((p) => isPublicMenuProduct(p.name));
  const categories = MENU_CATEGORIES.map((c) => c.id).filter((cat) =>
    menuProducts.some((p) => p.category === cat)
  );

  const saveLabel =
    saveStatus === 'saving'
      ? 'Guardando…'
      : saveStatus === 'error'
        ? 'Error al guardar'
        : hasSessionChanges
          ? 'Cambios pendientes…'
          : canEditOrder
            ? 'Guardado'
            : '';

  return (
    <div className="space-y-6">
      <p className="text-base font-medium text-cream sm:text-lg">
        Elige platillos y envía a cocina — paga al recoger.
      </p>

      {profileIncomplete && (
        <div className="rounded-lg border border-mustard/50 bg-mustard/10 px-4 py-3 text-sm text-cream">
          <strong className="text-mustard-light">Perfil incompleto.</strong> {profileMessage}{' '}
          <Link href="/perfil" className="font-medium text-mustard hover:underline">
            Ir a Mi perfil →
          </Link>
        </div>
      )}

      {activeOrder?.blocksNewOrder && !editingOpenOrder && (
        <div className="rounded-lg border border-mustard/50 bg-mustard/10 px-4 py-3 text-sm text-cream">
          <strong className="text-mustard-light">Pedido #{activeOrder.id} activo.</strong>{' '}
          {activeOrder.message}{' '}
          <a href="/mis-pedidos" className="font-medium text-mustard hover:underline">
            Ver mis pedidos →
          </a>
        </div>
      )}

      {restaurantOpen === false && (
        <div className="rounded-lg border border-ketchup/50 bg-ketchup/15 px-4 py-3 text-sm text-cream">
          <strong className="text-ketchup">Local cerrado.</strong> Por ahora no tomamos pedidos en
          línea. Puedes revisar{' '}
          <a href="/local" className="text-mustard hover:underline">
            disponibilidad
          </a>{' '}
          cuando volvamos a abrir.
        </div>
      )}

      {message && <div className="food-alert px-4 py-2 text-sm">{message}</div>}

      <div className="space-y-8">
        {categories.map((cat) => (
          <div key={cat} id={categorySectionId(cat)} className="scroll-mt-24">
            <h2 className="food-category-title mb-2">{cat}</h2>
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
                    type="button"
                    disabled={orderingBlocked}
                    onClick={() => handleProductClick(p)}
                    className="food-menu-item food-card-interactive px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50">
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
                      <span className="food-price shrink-0 text-lg">${p.price}</span>
                    </div>
                    {p.description && (
                      <p className="mt-1.5 text-xs leading-snug text-food-muted">{p.description}</p>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}

        <div className="food-cart p-4 sm:p-5">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold text-cream">
            <span>🧾</span> Tu pedido
            {saveLabel && (
              <span className="ml-auto text-[10px] font-normal text-food-muted">{saveLabel}</span>
            )}
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.map((c) => (
              <li key={c.key} className="food-card px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-cream/90">
                      {c.quantity}× {c.displayName}
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditCartItem(c)}
                      className="mt-1.5 flex h-7 items-center gap-1.5 rounded border border-food-border px-2.5 text-xs font-medium text-food-muted transition hover:border-mustard/50 hover:text-mustard-light">
                      <Pencil size={14} /> Modificar
                    </button>
                  </div>
                  <span className="food-price shrink-0">${(c.unitPrice * c.quantity).toFixed(0)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(c.key, c.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-food-border text-mustard hover:border-mustard/50">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-xs font-semibold">{c.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(c.key, c.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-food-border text-mustard hover:border-mustard/50">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartItemQuantity(c.key, 0)}
                    className="flex h-7 items-center gap-1.5 rounded border border-ketchup/40 px-2.5 text-xs font-medium text-ketchup transition hover:border-ketchup/60 hover:bg-ketchup/10">
                    <Trash2 size={14} /> Quitar
                  </button>
                </div>
              </li>
            ))}
            {!cart.length && <li className="text-food-muted">Sin platillos aún…</li>}
          </ul>
          <div className="mt-4 space-y-1 border-t border-dashed border-food-border pt-4 text-sm">
            <div className="font-display flex justify-between text-xl font-bold text-mustard">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          {canEditOrder && (
            <p className="mt-3 text-xs text-food-muted">
              Los cambios se guardan solos. Al salir puedes mantenerlos o descartarlos.
              {saveError && <span className="mt-1 block text-ketchup-light">{saveError}</span>}
            </p>
          )}
          <button
            type="button"
            onClick={openSubmitModal}
            disabled={!cart.length || submitting || orderingBlocked}
            className="btn-food mt-4 w-full py-2.5 text-sm disabled:opacity-40">
            {submitting ? 'Enviando…' : 'Enviar pedido a cocina'}
          </button>
        </div>
      </div>

      <OrderSubmitModal
        open={submitModalOpen}
        submitting={submitting}
        total={total}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={(payload) => void submitOrder(payload)}
      />

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
          }}
        />
      )}
    </div>
  );
}

export default function PedirPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-food-muted">Cargando menú…</div>
      }>
      <PedirPageContent />
    </Suspense>
  );
}
