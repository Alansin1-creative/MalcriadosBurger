'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  buildDisplayName,
  calculateUnitPrice,
  formatRemovalLabel,
  formatTacoVegStyle,
  getModifiersForCategory,
  getRemovablesForProduct,
  isTacoProduct,
  type ModifiersPayload,
  type TacoVegStyle,
} from '@/lib/data/product-modifiers';

interface Product {
  id: number;
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  description?: string;
}

interface Props {
  product: Product;
  onClose: () => void;
  onConfirm: (item: {
    product: Product;
    quantity: number;
    modifiers: ModifiersPayload;
    unitPrice: number;
    displayName: string;
  }) => void;
  initialQuantity?: number;
  initialModifiers?: ModifiersPayload;
  confirmLabel?: string;
  editing?: boolean;
}

type StepId = 'veg' | 'removals' | 'customize';

function QtyControl({
  value,
  min,
  max,
  onChange,
  size = 'md',
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md';
}) {
  const btn = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const text = size === 'sm' ? 'w-8 text-sm' : 'w-10 text-base';

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={`flex ${btn} items-center justify-center rounded-lg border border-food-border text-mustard hover:border-mustard hover:bg-diner-card disabled:opacity-30`}>
        <Minus size={16} />
      </button>
      <span className={`${text} text-center font-semibold text-cream`}>{value}</span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={`flex ${btn} items-center justify-center rounded-lg border border-food-border text-mustard hover:border-mustard hover:bg-diner-card disabled:opacity-30`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function ProductModifierModal({
  product,
  onClose,
  onConfirm,
  initialQuantity = 1,
  initialModifiers,
  confirmLabel,
  editing = false,
}: Props) {
  const isTaco = isTacoProduct(product.category);
  const options = getModifiersForCategory(product.category);
  const removables = getRemovablesForProduct(product.category, product.description ?? '');

  const steps = useMemo(() => {
    const list: StepId[] = [];
    if (isTaco) list.push('veg');
    if (removables.length > 0) list.push('removals');
    list.push('customize');
    return list;
  }, [isTaco, removables.length]);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex] ?? 'customize';

  const [tacoVegStyle, setTacoVegStyle] = useState<TacoVegStyle>(
    initialModifiers?.tacoVegStyle === 'apart' ? 'apart' : 'prepared'
  );
  const [removals, setRemovals] = useState<Set<string>>(
    () => new Set(initialModifiers?.removals ?? [])
  );
  const [productQty, setProductQty] = useState(initialQuantity);
  const [tacoPieces, setTacoPieces] = useState(initialModifiers?.tacoPieces ?? 4);
  const [extras, setExtras] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const e of initialModifiers?.extras ?? []) {
      if (e.qty > 0) map[e.id] = e.qty;
    }
    return map;
  });

  const payload: ModifiersPayload = useMemo(
    () => ({
      extras: Object.entries(extras)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty })),
      removals: [...removals],
      ...(isTaco ? { tacoPieces, tacoVegStyle } : {}),
    }),
    [extras, isTaco, removals, tacoPieces, tacoVegStyle]
  );

  const unitPrice = calculateUnitPrice(product.price, product.category, payload);
  const lineTotal = unitPrice * productQty;
  const displayName = buildDisplayName(product.name, product.category, payload);
  const pricePerTaco = product.price / 4;

  function setExtraQty(id: string, qty: number) {
    setExtras((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function toggleRemoval(id: string) {
    setRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addTacos(count: number) {
    setTacoPieces((p) => Math.min(24, p + count));
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    if (stepIndex === 0) onClose();
    else setStepIndex((i) => i - 1);
  }

  function goToStep(id: StepId) {
    const idx = steps.indexOf(id);
    if (idx >= 0) setStepIndex(idx);
  }

  function handleConfirm() {
    onConfirm({
      product,
      quantity: productQty,
      modifiers: payload,
      unitPrice,
      displayName,
    });
  }

  const stepLabel =
    steps.length > 1 ? `Paso ${stepIndex + 1} de ${steps.length}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div className="food-cart max-h-[92vh] w-full max-w-md overflow-y-auto p-4 sm:p-5">
        <div className="diner-awning -mx-4 -mt-4 mb-4 sm:-mx-5 sm:-mt-5" />

        {stepLabel && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-mustard">
            {stepLabel}
          </p>
        )}

        {currentStep === 'veg' && (
          <>
            <h2 className="font-display text-lg font-bold text-cream">¿Cómo quieres la verdura?</h2>
            {product.subtitle && <p className="food-subtitle mt-1">{product.subtitle}</p>}
            <p className="mt-0.5 text-sm text-food-muted">{product.name}</p>
            {product.description && (
              <p className="food-note mt-2 text-xs leading-relaxed">{product.description}</p>
            )}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setTacoVegStyle('prepared')}
                className={`food-card w-full border-2 p-4 text-left transition ${
                  tacoVegStyle === 'prepared'
                    ? 'border-mustard bg-mustard/10'
                    : 'border-food-border hover:border-mustard/40'
                }`}>
                <p className="font-display font-bold text-cream">Preparada</p>
                <p className="mt-1 text-xs text-food-muted">
                  Cebolla, tomate, cilantro y salsa puestos en el taco
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTacoVegStyle('apart')}
                className={`food-card w-full border-2 p-4 text-left transition ${
                  tacoVegStyle === 'apart'
                    ? 'border-mustard bg-mustard/10'
                    : 'border-food-border hover:border-mustard/40'
                }`}>
                <p className="font-display font-bold text-cream">Aparte</p>
                <p className="mt-1 text-xs text-food-muted">
                  Verdura y salsa en un recipiente aparte, tacos sin guarnición
                </p>
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="btn-food-outline flex-1 py-2.5 text-sm">
                Cancelar
              </button>
              <button type="button" onClick={goNext} className="btn-food flex-1 py-2.5 text-sm">
                Continuar
              </button>
            </div>
          </>
        )}

        {currentStep === 'removals' && (
          <>
            <h2 className="font-display text-lg font-bold text-cream">¿Quitar algo?</h2>
            {product.subtitle && <p className="food-subtitle mt-1">{product.subtitle}</p>}
            <p className="mt-0.5 text-sm text-food-muted">{product.name}</p>

            {isTaco && (
              <p className="mt-2 text-xs text-food-muted">
                Verdura:{' '}
                <span className="text-mustard-light">
                  {tacoVegStyle === 'apart' ? 'aparte' : 'preparada'}
                </span>
                <button
                  type="button"
                  onClick={() => goToStep('veg')}
                  className="ml-2 text-mustard hover:underline">
                  Cambiar
                </button>
              </p>
            )}

            <p className="food-category-title mb-3 mt-4">Sin ingrediente</p>
            <ul className="space-y-2">
              {removables.map((item) => {
                const checked = removals.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleRemoval(item.id)}
                      className={`food-card flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition ${
                        checked ? 'border-ketchup/50 bg-ketchup/15' : ''
                      }`}>
                      <span className={`text-sm ${checked ? 'text-cream' : 'text-cream/90'}`}>
                        Sin {item.label.toLowerCase()}
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                          checked
                            ? 'border-ketchup bg-ketchup text-cream'
                            : 'border-food-border text-transparent'
                        }`}>
                        ✓
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {removals.size > 0 && (
              <p className="mt-3 text-xs text-mustard-light">
                {[...removals].map((id) => formatRemovalLabel(id, product.category)).join(' · ')}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={goBack} className="btn-food-outline flex-1 py-2.5 text-sm">
                Atrás
              </button>
              <button type="button" onClick={goNext} className="btn-food flex-1 py-2.5 text-sm">
                Continuar
              </button>
            </div>
          </>
        )}

        {currentStep === 'customize' && (
          <>
            <h2 className="font-display text-lg font-bold text-cream">
              {editing
                ? 'Modificar platillo'
                : isTaco || options.length > 0
                  ? 'Arma tu platillo'
                  : 'Confirma cantidad'}
            </h2>
            {product.subtitle && <p className="food-subtitle mt-1">{product.subtitle}</p>}
            <p className="mt-0.5 text-sm text-food-muted">
              {product.name} — base ${product.price}
              {isTaco && <span> / 4 pzas</span>}
            </p>

            {isTaco && (
              <p className="mt-2 text-xs text-food-muted">
                Verdura:{' '}
                <span className="text-mustard-light">
                  {formatTacoVegStyle(tacoVegStyle) ?? 'preparada'}
                </span>
                <button
                  type="button"
                  onClick={() => goToStep('veg')}
                  className="ml-2 text-mustard hover:underline">
                  Editar
                </button>
              </p>
            )}

            {removals.size > 0 && (
              <p className="mt-2 text-xs text-food-muted">
                Sin:{' '}
                <span className="text-mustard-light">
                  {[...removals].map((id) => formatRemovalLabel(id, product.category)).join(', ')}
                </span>
                {removables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => goToStep('removals')}
                    className="ml-2 text-mustard hover:underline">
                    Editar
                  </button>
                )}
              </p>
            )}

            <div className="food-card mt-4 flex items-center justify-between px-3 py-3">
              <span className="text-sm font-medium text-cream">
                {isTaco ? 'Órdenes iguales' : 'Cantidad'}
              </span>
              <QtyControl value={productQty} min={1} max={20} onChange={setProductQty} />
            </div>

            {isTaco && (
              <div className="food-card mt-4 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cream">Tacos en esta orden</p>
                    <p className="text-xs text-food-muted">
                      Orden = 4 · 1 taco = ${pricePerTaco.toFixed(0)} · ½ orden = $
                      {(pricePerTaco * 2).toFixed(0)}
                    </p>
                  </div>
                  <QtyControl value={tacoPieces} min={4} max={24} onChange={setTacoPieces} size="sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addTacos(1)}
                    disabled={tacoPieces >= 24}
                    className="rounded-lg border border-mustard/50 bg-ketchup/20 px-3 py-1.5 text-xs font-medium text-mustard-light hover:bg-ketchup/30 disabled:opacity-40">
                    +1 taco (+${pricePerTaco.toFixed(0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => addTacos(2)}
                    disabled={tacoPieces >= 23}
                    className="rounded-lg border border-mustard/50 bg-ketchup/20 px-3 py-1.5 text-xs font-medium text-mustard-light hover:bg-ketchup/30 disabled:opacity-40">
                    +½ orden (+${(pricePerTaco * 2).toFixed(0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTacoPieces(4)}
                    className="btn-food-outline px-3 py-1.5 text-xs">
                    Reset 4 pzas
                  </button>
                </div>
                <p className="food-note mt-2">
                  ${pricePerTaco.toFixed(0)} × {tacoPieces} tacos = ${unitPrice}
                </p>
              </div>
            )}

            {options.length > 0 && (
              <div className="mt-4">
                <p className="food-category-title mb-2">Extras</p>
                <ul className="space-y-2">
                  {options.map((opt) => {
                    const qty = extras[opt.id] ?? 0;
                    return (
                      <li
                        key={opt.id}
                        className="food-card flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-cream">{opt.label}</p>
                          <p className="food-price text-xs">+${opt.price} c/u</p>
                        </div>
                        <QtyControl
                          value={qty}
                          min={0}
                          max={10}
                          onChange={(v) => setExtraQty(opt.id, v)}
                          size="sm"
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="food-card mt-4 border-mustard/30 p-3">
              <p className="text-xs text-food-muted">Tu pedido</p>
              <p className="text-sm font-medium text-cream">
                {productQty > 1 ? `${productQty}× ` : ''}
                {displayName}
              </p>
              <p className="font-display mt-1 text-xl font-bold text-mustard">
                ${lineTotal}
                {productQty > 1 && (
                  <span className="ml-1 text-sm font-normal text-food-muted">(${unitPrice} c/u)</span>
                )}
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={goBack} className="btn-food-outline flex-1 py-2.5 text-sm">
                Atrás
              </button>
              <button type="button" onClick={handleConfirm} className="btn-food flex-1 py-2.5 text-sm">
                {confirmLabel ?? (editing ? 'Actualizar línea' : 'Agregar al carrito')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
