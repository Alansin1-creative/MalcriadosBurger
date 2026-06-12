/** Menú Malcriados Burger & Dogos — precios en MXN */

export const RESTAURANT = {
  name: 'Malcriados Burger & Dogos',
  tagline: 'Hamburguesas, dogos, tortas y más sin modales',
};

export const HOT_DOG_CATEGORY_NOTE =
  'Primero quita lo que no quieras (sin catsup, sin frijoles…), luego agrega extras repetibles.';

export const BURGER_CATEGORY_NOTE =
  'Primero quita ingredientes (sin lechuga, sin jamón…), luego suma extras como carne, tocino o piña.';

export const TACOS_CATEGORY_NOTE =
  'Orden de 4 tacos. Elige verdura preparada o aparte, quita ingredientes si quieres y suma tacos extra.';

export const TORTAS_CATEGORY_NOTE =
  '4 tortas: la sencilla, carne extra, aguacatorta y monstruo.';

export type MenuProduct = {
  /** Nombre temático Malcriados */
  name: string;
  /** Qué es en el menú real */
  subtitle: string;
  category: string;
  price: number;
  cost: number;
  description: string;
};

/** cost ≈ 38–42% del precio (estimado operativo) */
export const MENU_PRODUCTS: MenuProduct[] = [
  // Hamburguesas
  {
    name: 'El Malcriado Clásico',
    subtitle: 'Hamburguesa sencilla',
    category: 'Hamburguesas',
    price: 55,
    cost: 22,
    description:
      'Carne de res, jamón, queso manchego, lechuga, tomate, mayonesa, catsup y mostaza.',
  },
  {
    name: 'Doble Pecado',
    subtitle: 'Hamburguesa doble',
    category: 'Hamburguesas',
    price: 75,
    cost: 30,
    description: 'Doble carne de res, jamón, queso, lechuga, tomate y aderezos.',
  },
  {
    name: 'Tocino sin Freno',
    subtitle: 'Hamburguesa con tocino',
    category: 'Hamburguesas',
    price: 75,
    cost: 30,
    description: 'Carne, tocino crujiente, jamón, queso, lechuga, tomate y aderezos.',
  },
  {
    name: 'Champiñón Desobediente',
    subtitle: 'Hamburguesa con champiñones',
    category: 'Hamburguesas',
    price: 75,
    cost: 28,
    description: 'Carne, champiñones salteados, jamón, queso, lechuga, tomate y aderezos.',
  },
  {
    name: 'Hawai sin Modales',
    subtitle: 'Hamburguesa hawaiana',
    category: 'Hamburguesas',
    price: 75,
    cost: 29,
    description: 'Carne, piña asada, jamón, queso, lechuga y aderezos.',
  },
  {
    name: 'Tripitas del Barrio',
    subtitle: 'Hamburguesa de carne y tripitas',
    category: 'Hamburguesas',
    price: 85,
    cost: 34,
    description:
      'Carne, tripitas guisadas, jamón, queso, lechuga, tomate y aderezos.',
  },

  // Hot dogs
  {
    name: 'Dogo Patín',
    subtitle: 'Hot dog sencillo',
    category: 'Hot dogs',
    price: 45,
    cost: 16,
    description:
      'Pan, salchicha, tocino, frijoles, pico de gallo, mayonesa, catsup y mostaza.',
  },
  {
    name: 'Dogo Quesabroso',
    subtitle: 'Hot dog con queso',
    category: 'Hot dogs',
    price: 55,
    cost: 20,
    description: 'Pan, salchicha, queso fundido, tocino, frijoles, pico de gallo y aderezos.',
  },
  {
    name: 'Dogo Aloha Malcriado',
    subtitle: 'Hot dog hawaiano',
    category: 'Hot dogs',
    price: 65,
    cost: 24,
    description: 'Pan, salchicha, piña, queso, tocino, frijoles, pico de gallo y aderezos.',
  },
  {
    name: 'Dogo Champi Rebelde',
    subtitle: 'Hot dog con champiñones',
    category: 'Hot dogs',
    price: 65,
    cost: 23,
    description: 'Pan, salchicha, champiñones, tocino, frijoles, pico de gallo y aderezos.',
  },
  {
    name: 'Dogo Tripón',
    subtitle: 'Hot dog con tripitas',
    category: 'Hot dogs',
    price: 75,
    cost: 28,
    description: 'Pan, salchicha, tripitas, tocino, frijoles, pico de gallo y aderezos.',
  },

  // Tortas — solo estas 4 en carta
  {
    name: 'La Malcriada',
    subtitle: 'Torta sencilla',
    category: 'Tortas',
    price: 75,
    cost: 28,
    description:
      'Lomo de cerdo, aguacate, jamón, queso y mayonesa en pan de telera.',
  },
  {
    name: 'La Encerrada',
    subtitle: 'Con carne de hamburguesa, jamón y queso extra',
    category: 'Tortas',
    price: 95,
    cost: 36,
    description: 'Carne de hamburguesa, jamón y queso extra, lechuga y tomate.',
  },
  {
    name: 'Aguacatorta',
    subtitle: 'Aguacatorta con triple porción de aguacate',
    category: 'Tortas',
    price: 100,
    cost: 42,
    description:
      'Lomo de cerdo, triple porción de aguacate, jamón, queso y mayonesa.',
  },
  {
    name: 'Monstruo Malcriado',
    subtitle: 'Monstruo',
    category: 'Tortas',
    price: 125,
    cost: 48,
    description:
      'Carne de hamburguesa, jamón, queso, tripitas, jamón y queso.',
  },

  // Papas y aros
  {
    name: 'Patín de Papas',
    subtitle: 'Papas a la francesa',
    category: 'Papas y Aros',
    price: 45,
    cost: 12,
    description: 'Porción crujiente de papas fritas.',
  },
  {
    name: 'Papas Quesabrosas',
    subtitle: 'Papas con queso',
    category: 'Papas y Aros',
    price: 55,
    cost: 16,
    description: 'Papas a la francesa bañadas en queso amarillo fundido.',
  },
  {
    name: 'Aros del Apocalipsis',
    subtitle: 'Aros de cebolla',
    category: 'Papas y Aros',
    price: 55,
    cost: 15,
    description: 'Aros de cebolla empanizados y dorados.',
  },
  {
    name: 'Aros Fundidos',
    subtitle: 'Aros con queso',
    category: 'Papas y Aros',
    price: 65,
    cost: 18,
    description: 'Aros de cebolla con queso amarillo gratinado.',
  },
  {
    name: 'Pulpo Salchichero',
    subtitle: 'Salchipulpos',
    category: 'Papas y Aros',
    price: 75,
    cost: 22,
    description: 'Papas con salchichas en forma de pulpo y queso amarillo.',
  },

  // Tacos — orden de 4
  {
    name: 'Cuatro Bisteces',
    subtitle: 'Orden de 4 tacos de bistec',
    category: 'Tacos',
    price: 80,
    cost: 30,
    description: '4 tacos de bistec con cebolla, tomate y salsa.',
  },
  {
    name: 'Cuatro Tripas',
    subtitle: 'Orden de 4 tacos de tripitas',
    category: 'Tacos',
    price: 80,
    cost: 32,
    description: '4 tacos de tripitas con cebolla y cilantro.',
  },
  {
    name: 'Bistec Encebollado x4',
    subtitle: 'Orden de 4 tacos bistec encebollado',
    category: 'Tacos',
    price: 80,
    cost: 31,
    description: '4 tacos de bistec con cebolla caramelizada.',
  },

  // Bebidas
  {
    name: 'Agua de litro',
    subtitle: 'Agua embotellada 1 L',
    category: 'Bebidas',
    price: 20,
    cost: 8,
    description: 'Agua purificada de 1 litro.',
  },
  {
    name: 'Coca-Cola 600 ml',
    subtitle: 'Refresco',
    category: 'Bebidas',
    price: 28,
    cost: 12,
    description: 'Coca-Cola 600 ml bien fría.',
  },
  {
    name: 'Coca-Cola Light 600 ml',
    subtitle: 'Refresco',
    category: 'Bebidas',
    price: 28,
    cost: 12,
    description: 'Coca-Cola Light 600 ml.',
  },
  {
    name: 'Elite Fresa 600 ml',
    subtitle: 'Refresco',
    category: 'Bebidas',
    price: 28,
    cost: 12,
    description: 'Elite sabor fresa 600 ml.',
  },
  {
    name: 'Elite Uva 600 ml',
    subtitle: 'Refresco',
    category: 'Bebidas',
    price: 28,
    cost: 12,
    description: 'Elite sabor uva 600 ml.',
  },
  {
    name: 'Manzanita Sol 600 ml',
    subtitle: 'Refresco',
    category: 'Bebidas',
    price: 28,
    cost: 12,
    description: 'Manzanita Sol 600 ml.',
  },
];

/** Solo para líneas de combos — no aparece en el menú para pedir. */
export const COMBO_ONLY_PRODUCTS: MenuProduct[] = [
  {
    name: 'Refresco a elegir 600 ml',
    subtitle: 'Coca-Cola, Light, Elite o Manzanita',
    category: 'Bebidas',
    price: 28,
    cost: 12,
    description:
      'Elige al recoger: Coca-Cola, Coca-Cola Light, Elite (fresa o uva) o Manzanita Sol.',
  },
];

export const CANONICAL_PRODUCTS: MenuProduct[] = [...MENU_PRODUCTS, ...COMBO_ONLY_PRODUCTS];

export const HIDDEN_FROM_PUBLIC_MENU = new Set(
  COMBO_ONLY_PRODUCTS.map((p) => p.name)
);

export function isPublicMenuProduct(name: string): boolean {
  return !HIDDEN_FROM_PUBLIC_MENU.has(name);
}

export const INGREDIENTS: [string, string, number, number, number, string][] = [
  ['Carne molida', 'kg', 10, 14, 110, 'Carnicería'],
  ['Tripitas', 'kg', 6, 8, 95, 'Carnicería'],
  ['Bistec', 'kg', 6, 7, 130, 'Carnicería'],
  ['Lomo de cerdo', 'kg', 4, 5, 120, 'Carnicería'],
  ['Pan hamburguesa', 'pz', 40, 55, 4.5, 'Panadería'],
  ['Pan hot dog', 'pz', 30, 40, 3.5, 'Panadería'],
  ['Pan torta', 'pz', 25, 35, 5, 'Panadería'],
  ['Tortillas', 'pz', 150, 200, 0.8, 'Tortillería'],
  ['Jamón', 'kg', 4, 5, 85, 'Abarrotes'],
  ['Queso manchego', 'kg', 5, 6, 115, 'Lácteos'],
  ['Queso amarillo', 'kg', 3, 4, 95, 'Lácteos'],
  ['Tocino', 'kg', 3, 4, 140, 'Carnicería'],
  ['Lechuga', 'kg', 3, 4, 35, 'Verduras'],
  ['Tomate', 'kg', 5, 6, 28, 'Verduras'],
  ['Cebolla', 'kg', 5, 6, 22, 'Verduras'],
  ['Champiñones', 'kg', 3, 3.5, 65, 'Verduras'],
  ['Piña', 'kg', 2, 2.5, 40, 'Verduras'],
  ['Aguacate', 'kg', 3, 4, 75, 'Verduras'],
  ['Papas', 'kg', 15, 20, 18, 'Verduras'],
  ['Aros de cebolla congelados', 'kg', 4, 5, 55, 'Congelados'],
  ['Salchichas', 'kg', 4, 5, 48, 'Abarrotes'],
  ['Frijoles refritos', 'kg', 5, 6, 25, 'Abarrotes'],
  ['Mayonesa', 'L', 3, 4, 42, 'Abarrotes'],
  ['Catsup', 'L', 2, 3, 38, 'Abarrotes'],
  ['Mostaza', 'L', 1, 1.5, 45, 'Abarrotes'],
];

/** productName (título temático) → [ingredientName, quantity per unit] */
export const RECIPES: Record<string, [string, number][]> = {
  'El Malcriado Clásico': [
    ['Carne molida', 0.12],
    ['Pan hamburguesa', 1],
    ['Jamón', 0.02],
    ['Queso manchego', 0.03],
    ['Lechuga', 0.02],
    ['Tomate', 0.03],
    ['Mayonesa', 0.015],
    ['Catsup', 0.01],
    ['Mostaza', 0.005],
  ],
  'Doble Pecado': [
    ['Carne molida', 0.22],
    ['Pan hamburguesa', 1],
    ['Jamón', 0.02],
    ['Queso manchego', 0.04],
    ['Lechuga', 0.02],
    ['Tomate', 0.03],
    ['Mayonesa', 0.015],
    ['Catsup', 0.01],
    ['Mostaza', 0.005],
  ],
  'Tocino sin Freno': [
    ['Carne molida', 0.12],
    ['Tocino', 0.04],
    ['Pan hamburguesa', 1],
    ['Jamón', 0.02],
    ['Queso manchego', 0.03],
    ['Lechuga', 0.02],
    ['Tomate', 0.03],
  ],
  'Champiñón Desobediente': [
    ['Carne molida', 0.12],
    ['Champiñones', 0.06],
    ['Pan hamburguesa', 1],
    ['Jamón', 0.02],
    ['Queso manchego', 0.03],
    ['Lechuga', 0.02],
    ['Tomate', 0.03],
  ],
  'Hawai sin Modales': [
    ['Carne molida', 0.12],
    ['Piña', 0.05],
    ['Pan hamburguesa', 1],
    ['Jamón', 0.03],
    ['Queso manchego', 0.03],
    ['Lechuga', 0.02],
  ],
  'Tripitas del Barrio': [
    ['Carne molida', 0.12],
    ['Tripitas', 0.12],
    ['Pan hamburguesa', 1],
    ['Jamón', 0.02],
    ['Queso manchego', 0.03],
    ['Lechuga', 0.02],
    ['Tomate', 0.03],
  ],
  'Dogo Patín': [
    ['Salchichas', 0.08],
    ['Pan hot dog', 1],
    ['Tocino', 0.03],
    ['Frijoles refritos', 0.06],
    ['Tomate', 0.02],
    ['Cebolla', 0.02],
    ['Mayonesa', 0.01],
  ],
  'Dogo Quesabroso': [
    ['Salchichas', 0.08],
    ['Pan hot dog', 1],
    ['Queso manchego', 0.04],
    ['Tocino', 0.03],
    ['Frijoles refritos', 0.06],
  ],
  'Dogo Aloha Malcriado': [
    ['Salchichas', 0.08],
    ['Pan hot dog', 1],
    ['Piña', 0.04],
    ['Queso manchego', 0.03],
    ['Tocino', 0.03],
    ['Frijoles refritos', 0.05],
  ],
  'Dogo Champi Rebelde': [
    ['Salchichas', 0.08],
    ['Pan hot dog', 1],
    ['Champiñones', 0.05],
    ['Tocino', 0.03],
    ['Frijoles refritos', 0.05],
  ],
  'Dogo Tripón': [
    ['Salchichas', 0.08],
    ['Tripitas', 0.08],
    ['Pan hot dog', 1],
    ['Tocino', 0.03],
    ['Frijoles refritos', 0.05],
    ['Tomate', 0.02],
    ['Cebolla', 0.02],
    ['Mayonesa', 0.01],
  ],
  'La Malcriada': [
    ['Pan torta', 1],
    ['Lomo de cerdo', 0.12],
    ['Aguacate', 0.06],
    ['Jamón', 0.04],
    ['Queso manchego', 0.04],
    ['Mayonesa', 0.02],
  ],
  'La Encerrada': [
    ['Pan torta', 1],
    ['Carne molida', 0.12],
    ['Jamón', 0.05],
    ['Queso manchego', 0.06],
    ['Lechuga', 0.02],
    ['Tomate', 0.03],
  ],
  'Monstruo Malcriado': [
    ['Pan torta', 1],
    ['Carne molida', 0.12],
    ['Tripitas', 0.1],
    ['Jamón', 0.06],
    ['Queso manchego', 0.08],
  ],
  Aguacatorta: [
    ['Pan torta', 1],
    ['Lomo de cerdo', 0.12],
    ['Aguacate', 0.18],
    ['Jamón', 0.04],
    ['Queso manchego', 0.04],
    ['Mayonesa', 0.02],
  ],
  'Patín de Papas': [['Papas', 0.25]],
  'Papas Quesabrosas': [
    ['Papas', 0.25],
    ['Queso amarillo', 0.05],
  ],
  'Aros del Apocalipsis': [['Aros de cebolla congelados', 0.15]],
  'Aros Fundidos': [
    ['Aros de cebolla congelados', 0.15],
    ['Queso amarillo', 0.05],
  ],
  'Pulpo Salchichero': [
    ['Papas', 0.2],
    ['Salchichas', 0.1],
    ['Queso amarillo', 0.06],
  ],
  'Cuatro Bisteces': [
    ['Bistec', 0.4],
    ['Tortillas', 4],
    ['Cebolla', 0.08],
    ['Tomate', 0.06],
  ],
  'Cuatro Tripas': [
    ['Tripitas', 0.48],
    ['Tortillas', 4],
    ['Cebolla', 0.08],
  ],
  'Bistec Encebollado x4': [
    ['Bistec', 0.4],
    ['Tortillas', 4],
    ['Cebolla', 0.12],
  ],
};

const META_BY_NAME = new Map(
  MENU_PRODUCTS.map((p) => [p.name, { subtitle: p.subtitle, description: p.description }])
);

export function getProductSubtitle(name: string, fallback = ''): string {
  return META_BY_NAME.get(name)?.subtitle ?? fallback;
}

export function getProductDescription(name: string, fallback = ''): string {
  return META_BY_NAME.get(name)?.description ?? fallback;
}
