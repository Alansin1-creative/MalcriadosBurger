/** Personalización POS — extras con cantidad (Malcriados Burger) */

export type ModifierSelection = { id: string; qty: number };

/** Solo tacos: verdura mezclada en el taco o servida aparte */
export type TacoVegStyle = 'prepared' | 'apart';

export type ModifiersPayload = {
  extras: ModifierSelection[];
  /** Ingredientes a quitar (sin lechuga, sin catsup, etc.) */
  removals?: string[];
  /** Solo tacos: piezas por línea (mín. 4 = orden completa) */
  tacoPieces?: number;
  /** Solo tacos: verdura preparada (default) o aparte */
  tacoVegStyle?: TacoVegStyle;
};

export type RemovableIngredient = {
  id: string;
  label: string;
  keywords: string[];
};

const BURGER_REMOVABLES: RemovableIngredient[] = [
  { id: 'lechuga', label: 'Lechuga', keywords: ['lechuga'] },
  { id: 'tomate', label: 'Tomate', keywords: ['tomate'] },
  { id: 'jamon', label: 'Jamón', keywords: ['jamón', 'jamon'] },
  { id: 'queso', label: 'Queso', keywords: ['queso'] },
  { id: 'mayonesa', label: 'Mayonesa', keywords: ['mayonesa'] },
  { id: 'catsup', label: 'Catsup', keywords: ['catsup', 'ketchup'] },
  { id: 'mostaza', label: 'Mostaza', keywords: ['mostaza'] },
  { id: 'tocino', label: 'Tocino', keywords: ['tocino'] },
  { id: 'pina', label: 'Piña', keywords: ['piña', 'pina'] },
  { id: 'champinones', label: 'Champiñones', keywords: ['champiñones', 'champinones'] },
  { id: 'tripitas', label: 'Tripitas', keywords: ['tripitas'] },
];

const HOT_DOG_REMOVABLES: RemovableIngredient[] = [
  { id: 'tocino', label: 'Tocino', keywords: ['tocino'] },
  { id: 'frijoles', label: 'Frijoles', keywords: ['frijoles'] },
  { id: 'pico', label: 'Pico de gallo', keywords: ['pico de gallo', 'pico'] },
  { id: 'mayonesa', label: 'Mayonesa', keywords: ['mayonesa'] },
  { id: 'catsup', label: 'Catsup', keywords: ['catsup', 'ketchup'] },
  { id: 'mostaza', label: 'Mostaza', keywords: ['mostaza'] },
  { id: 'queso', label: 'Queso', keywords: ['queso'] },
  { id: 'pina', label: 'Piña', keywords: ['piña', 'pina'] },
  { id: 'champinones', label: 'Champiñones', keywords: ['champiñones', 'champinones'] },
  { id: 'tripitas', label: 'Tripitas', keywords: ['tripitas'] },
];

const TACO_REMOVABLES: RemovableIngredient[] = [
  { id: 'cebolla', label: 'Cebolla', keywords: ['cebolla'] },
  { id: 'tomate', label: 'Tomate', keywords: ['tomate'] },
  { id: 'cilantro', label: 'Cilantro', keywords: ['cilantro'] },
  { id: 'salsa', label: 'Salsa', keywords: ['salsa'] },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function getRemovablesForProduct(category: string, description = ''): RemovableIngredient[] {
  const pool =
    category === 'Hot dogs'
      ? HOT_DOG_REMOVABLES
      : category === 'Hamburguesas'
        ? BURGER_REMOVABLES
        : category === 'Tacos'
          ? TACO_REMOVABLES
          : [];

  if (!pool.length) return [];

  const desc = normalizeText(description);
  const hasAderezos = desc.includes('aderezos');

  return pool.filter((item) => {
    if (item.id === 'mayonesa' || item.id === 'catsup' || item.id === 'mostaza') {
      return item.keywords.some((k) => desc.includes(normalizeText(k))) || hasAderezos;
    }
    return item.keywords.some((k) => desc.includes(normalizeText(k)));
  });
}

export function getRemovableById(id: string, category?: string): RemovableIngredient | undefined {
  const pool =
    category === 'Hot dogs'
      ? HOT_DOG_REMOVABLES
      : category === 'Hamburguesas'
        ? BURGER_REMOVABLES
        : category === 'Tacos'
          ? TACO_REMOVABLES
          : [...BURGER_REMOVABLES, ...HOT_DOG_REMOVABLES, ...TACO_REMOVABLES];
  return pool.find((r) => r.id === id);
}

export function formatRemovalLabel(id: string, category?: string): string {
  const item = getRemovableById(id, category);
  return item ? `sin ${item.label.toLowerCase()}` : `sin ${id}`;
}

export function formatTacoVegStyle(style: TacoVegStyle | undefined): string | null {
  if (style === 'apart') return 'verdura aparte';
  return null;
}

export type ProductModifier = {
  id: string;
  label: string;
  price: number;
  /** Ingredientes por cada unidad del extra */
  ingredients: [string, number][];
};

const BURGER_EXTRAS: ProductModifier[] = [
  {
    id: 'carne_extra',
    label: 'Carne extra',
    price: 20,
    ingredients: [['Carne molida', 0.1]],
  },
  {
    id: 'tocino',
    label: 'Tocino',
    price: 20,
    ingredients: [['Tocino', 0.04]],
  },
  {
    id: 'pina',
    label: 'Piña',
    price: 20,
    ingredients: [['Piña', 0.05]],
  },
  {
    id: 'champiñones',
    label: 'Champiñones',
    price: 20,
    ingredients: [['Champiñones', 0.06]],
  },
  {
    id: 'tripitas',
    label: 'Tripitas',
    price: 30,
    ingredients: [['Tripitas', 0.12]],
  },
];

const HOT_DOG_EXTRAS: ProductModifier[] = [
  {
    id: 'salchicha_extra',
    label: 'Salchicha extra',
    price: 15,
    ingredients: [['Salchichas', 0.08]],
  },
  {
    id: 'queso',
    label: 'Queso extra',
    price: 15,
    ingredients: [['Queso manchego', 0.04]],
  },
  {
    id: 'tocino',
    label: 'Tocino',
    price: 20,
    ingredients: [['Tocino', 0.04]],
  },
  {
    id: 'pina',
    label: 'Piña',
    price: 20,
    ingredients: [['Piña', 0.05]],
  },
  {
    id: 'champiñones',
    label: 'Champiñones',
    price: 20,
    ingredients: [['Champiñones', 0.06]],
  },
  {
    id: 'tripitas',
    label: 'Tripitas',
    price: 30,
    ingredients: [['Tripitas', 0.12]],
  },
];

const TACO_BASE_PIECES = 4;

export const CUSTOMIZABLE_CATEGORIES = new Set(['Hamburguesas', 'Hot dogs', 'Tacos']);

export function isCustomizableProduct(category: string) {
  return CUSTOMIZABLE_CATEGORIES.has(category);
}

export function isTacoProduct(category: string) {
  return category === 'Tacos';
}

export function getModifiersForCategory(category: string): ProductModifier[] {
  if (category === 'Hot dogs') return HOT_DOG_EXTRAS;
  if (category === 'Hamburguesas') return BURGER_EXTRAS;
  return [];
}

export function getModifierById(id: string, category?: string): ProductModifier | undefined {
  const pool = category ? getModifiersForCategory(category) : [...BURGER_EXTRAS, ...HOT_DOG_EXTRAS];
  return pool.find((m) => m.id === id);
}

export function emptyModifiersPayload(): ModifiersPayload {
  return { extras: [], removals: [] };
}

export function parseModifiersPayload(raw: unknown): ModifiersPayload {
  if (!raw) return emptyModifiersPayload();

  if (typeof raw === 'object' && raw !== null && 'extras' in raw) {
    const obj = raw as ModifiersPayload;
    return {
      extras: Array.isArray(obj.extras)
        ? obj.extras.filter((e) => e && e.qty > 0)
        : [],
      removals: Array.isArray(obj.removals)
        ? obj.removals.filter((r): r is string => typeof r === 'string' && r.length > 0)
        : [],
      tacoPieces: obj.tacoPieces,
      tacoVegStyle:
        obj.tacoVegStyle === 'apart' || obj.tacoVegStyle === 'prepared'
          ? obj.tacoVegStyle
          : undefined,
    };
  }

  // Compatibilidad: ["tocino","pina"] → extras con qty 1
  if (Array.isArray(raw)) {
    const counts = new Map<string, number>();
    for (const id of raw) {
      if (typeof id === 'string') {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return {
      extras: [...counts.entries()].map(([id, qty]) => ({ id, qty })),
    };
  }

  return emptyModifiersPayload();
}

export function serializeModifiersPayload(payload: ModifiersPayload): string {
  const removals = (payload.removals ?? []).filter(Boolean);
  return JSON.stringify({
    extras: payload.extras.filter((e) => e.qty > 0),
    ...(removals.length ? { removals } : {}),
    ...(payload.tacoPieces ? { tacoPieces: payload.tacoPieces } : {}),
    ...(payload.tacoVegStyle === 'apart' ? { tacoVegStyle: 'apart' } : {}),
  });
}

export function getTacoPieces(payload: ModifiersPayload): number {
  return payload.tacoPieces ?? TACO_BASE_PIECES;
}

export function tacoPricePerPiece(basePrice: number): number {
  return basePrice / TACO_BASE_PIECES;
}

export function calculateExtrasPrice(category: string, extras: ModifierSelection[]): number {
  let total = 0;
  for (const { id, qty } of extras) {
    if (qty <= 0) continue;
    const mod = getModifierById(id, category);
    if (mod) total += mod.price * qty;
  }
  return total;
}

export function calculateUnitPrice(
  basePrice: number,
  category: string,
  payload: ModifiersPayload
): number {
  if (category === 'Tacos') {
    const pieces = getTacoPieces(payload);
    return Math.round(tacoPricePerPiece(basePrice) * pieces);
  }
  return basePrice + calculateExtrasPrice(category, payload.extras);
}

export function buildDisplayName(
  baseName: string,
  category: string,
  payload: ModifiersPayload
): string {
  if (category === 'Tacos') {
    const pieces = getTacoPieces(payload);
    const removalParts = (payload.removals ?? []).map((id) => formatRemovalLabel(id, category));
    const vegLabel = formatTacoVegStyle(payload.tacoVegStyle);
    const tacoSuffix = pieces !== TACO_BASE_PIECES ? `${pieces} pzas` : '';
    const parts = [
      ...(vegLabel ? [vegLabel] : []),
      ...removalParts,
      ...(tacoSuffix ? [tacoSuffix] : []),
    ];
    if (!parts.length) return baseName;
    return `${baseName} (${parts.join(', ')})`;
  }

  const removalParts = (payload.removals ?? []).map((id) => formatRemovalLabel(id, category));
  const extraParts = payload.extras
    .filter((e) => e.qty > 0)
    .map((e) => {
      const mod = getModifierById(e.id, category);
      const label = mod?.label ?? e.id;
      return e.qty > 1 ? `${label} x${e.qty}` : label;
    });

  const parts = [...removalParts, ...extraParts];
  if (!parts.length) return baseName;
  return `${baseName} (${parts.join(', ')})`;
}

export function cartItemKey(productId: number, payload: ModifiersPayload): string {
  const sortedExtras = [...payload.extras]
    .filter((e) => e.qty > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  const sortedRemovals = [...(payload.removals ?? [])].sort();
  const taco = payload.tacoPieces ?? TACO_BASE_PIECES;
  const veg = payload.tacoVegStyle ?? 'prepared';
  return `${productId}-${taco}-v:${veg}-r:${sortedRemovals.join(',')}-e:${sortedExtras.map((e) => `${e.id}:${e.qty}`).join(',')}`;
}
