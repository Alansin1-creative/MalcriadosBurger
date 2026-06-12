export type ComboSize = 1 | 2 | '4-6';

export type ComboItem = {
  productName: string;
  quantity: number;
};

export type MenuCombo = {
  id: string;
  name: string;
  tagline: string;
  size: ComboSize;
  emoji: string;
  items: ComboItem[];
};

/** Bebida genérica en combos — el cliente elige sabor al recoger. */
export const REFRESCO_A_ELEGIR = 'Refresco a elegir 600 ml';

export const MENU_CATEGORIES = [
  { id: 'Hamburguesas', label: 'Hamburguesas', emoji: '🍔' },
  { id: 'Hot dogs', label: 'Dogos', emoji: '🌭' },
  { id: 'Tacos', label: 'Tacos', emoji: '🌮' },
  { id: 'Tortas', label: 'Tortas', emoji: '🥖' },
  { id: 'Papas y Aros', label: 'Papas', emoji: '🍟' },
  { id: 'Bebidas', label: 'Bebidas', emoji: '🥤' },
] as const;

export const MENU_COMBOS: MenuCombo[] = [
  // —— 1 persona ——
  {
    id: 'clasico-solo',
    name: 'Clásico Solo',
    tagline: 'Hamburguesa, papas y refresco a elegir',
    size: 1,
    emoji: '🍔',
    items: [
      { productName: 'El Malcriado Clásico', quantity: 1 },
      { productName: 'Patín de Papas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 1 },
    ],
  },
  {
    id: 'dogo-express',
    name: 'Dogo Express',
    tagline: 'Dogo sencillo, papas y refresco a elegir',
    size: 1,
    emoji: '🌭',
    items: [
      { productName: 'Dogo Patín', quantity: 1 },
      { productName: 'Patín de Papas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 1 },
    ],
  },
  {
    id: 'taco-time',
    name: 'Taco Time',
    tagline: 'Orden de tacos y refresco a elegir',
    size: 1,
    emoji: '🌮',
    items: [
      { productName: 'Cuatro Bisteces', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 1 },
    ],
  },

  // —— 2 personas ——
  {
    id: 'pareja-clasica',
    name: 'Pareja Clásica',
    tagline: 'Dos burgers, papas con queso y 2 refrescos a elegir',
    size: 2,
    emoji: '👫',
    items: [
      { productName: 'El Malcriado Clásico', quantity: 2 },
      { productName: 'Papas Quesabrosas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 2 },
    ],
  },
  {
    id: 'dogo-doble',
    name: 'Dogo Doble',
    tagline: 'Dos dogos con queso, aros y 2 refrescos a elegir',
    size: 2,
    emoji: '🌭',
    items: [
      { productName: 'Dogo Quesabroso', quantity: 2 },
      { productName: 'Aros del Apocalipsis', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 2 },
    ],
  },
  {
    id: 'torta-y-tacos',
    name: 'Torta y Tacos',
    tagline: 'Torta, tacos de tripa, papas y 2 refrescos a elegir',
    size: 2,
    emoji: '🥖',
    items: [
      { productName: 'La Malcriada', quantity: 1 },
      { productName: 'Cuatro Tripas', quantity: 1 },
      { productName: 'Patín de Papas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 2 },
    ],
  },

  // —— 4 a 6 personas ——
  {
    id: 'familia-burger',
    name: 'Familia Burger',
    tagline: '4 clásicos, papas y 4 refrescos a elegir',
    size: '4-6',
    emoji: '👨‍👩‍👧‍👦',
    items: [
      { productName: 'El Malcriado Clásico', quantity: 4 },
      { productName: 'Papas Quesabrosas', quantity: 2 },
      { productName: 'Patín de Papas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 4 },
    ],
  },
  {
    id: 'dogos-party',
    name: 'Dogos Party',
    tagline: '4 dogos con queso, salchipulpos y 4 refrescos a elegir',
    size: '4-6',
    emoji: '🌭',
    items: [
      { productName: 'Dogo Quesabroso', quantity: 4 },
      { productName: 'Pulpo Salchichero', quantity: 2 },
      { productName: 'Patín de Papas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 4 },
    ],
  },
  {
    id: 'mix-malcriado',
    name: 'Mix Malcriado',
    tagline: 'Dobles, dogos, papas y 5 refrescos a elegir',
    size: '4-6',
    emoji: '🍔',
    items: [
      { productName: 'Doble Pecado', quantity: 3 },
      { productName: 'Dogo Patín', quantity: 2 },
      { productName: 'Papas Quesabrosas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 5 },
    ],
  },
  {
    id: 'taco-fiesta',
    name: 'Taco Fiesta',
    tagline: '3 órdenes de tacos, tortas y 5 refrescos a elegir',
    size: '4-6',
    emoji: '🌮',
    items: [
      { productName: 'Cuatro Bisteces', quantity: 2 },
      { productName: 'Cuatro Tripas', quantity: 1 },
      { productName: 'La Malcriada', quantity: 2 },
      { productName: 'Patín de Papas', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 5 },
    ],
  },
  {
    id: 'tortas-grandes',
    name: 'Tortas Grandes',
    tagline: 'Monstruo, aguacatorta, encerrada y 5 refrescos a elegir',
    size: '4-6',
    emoji: '🥖',
    items: [
      { productName: 'Monstruo Malcriado', quantity: 1 },
      { productName: 'Aguacatorta', quantity: 1 },
      { productName: 'La Encerrada', quantity: 1 },
      { productName: 'Papas Quesabrosas', quantity: 2 },
      { productName: REFRESCO_A_ELEGIR, quantity: 5 },
    ],
  },
  {
    id: 'barrio-fuerte',
    name: 'Barrio Fuerte',
    tagline: '4 tripitas burger, papas, aros y 6 refrescos a elegir',
    size: '4-6',
    emoji: '💪',
    items: [
      { productName: 'Tripitas del Barrio', quantity: 4 },
      { productName: 'Papas Quesabrosas', quantity: 2 },
      { productName: 'Aros Fundidos', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 6 },
    ],
  },
  {
    id: 'super-tocino',
    name: 'Super Tocino',
    tagline: '4 tocino burger, salchipulpos y 5 refrescos a elegir',
    size: '4-6',
    emoji: '🥓',
    items: [
      { productName: 'Tocino sin Freno', quantity: 4 },
      { productName: 'Pulpo Salchichero', quantity: 2 },
      { productName: 'Aros del Apocalipsis', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 5 },
    ],
  },
  {
    id: 'cuatro-fuegos',
    name: 'Cuatro Fuegos',
    tagline: '4 tocino, 2 dobles, papas y 6 refrescos a elegir',
    size: '4-6',
    emoji: '🔥',
    items: [
      { productName: 'Tocino sin Freno', quantity: 4 },
      { productName: 'Doble Pecado', quantity: 2 },
      { productName: 'Papas Quesabrosas', quantity: 2 },
      { productName: REFRESCO_A_ELEGIR, quantity: 6 },
    ],
  },
  {
    id: 'fiesta-tacos-tortas',
    name: 'Fiesta Tacos & Tortas',
    tagline: 'Tacos, tortas premium, burgers y 6 refrescos a elegir',
    size: '4-6',
    emoji: '🎉',
    items: [
      { productName: 'Cuatro Bisteces', quantity: 2 },
      { productName: 'La Encerrada', quantity: 1 },
      { productName: 'Monstruo Malcriado', quantity: 1 },
      { productName: 'Champiñón Desobediente', quantity: 2 },
      { productName: REFRESCO_A_ELEGIR, quantity: 6 },
    ],
  },
  {
    id: 'malcriados-xl',
    name: 'Malcriados XL',
    tagline: 'Burgers, dogos, salchipulpos y 6 refrescos a elegir',
    size: '4-6',
    emoji: '👑',
    items: [
      { productName: 'Doble Pecado', quantity: 2 },
      { productName: 'Tocino sin Freno', quantity: 2 },
      { productName: 'Dogo Tripón', quantity: 2 },
      { productName: 'Pulpo Salchichero', quantity: 2 },
      { productName: 'Aros Fundidos', quantity: 1 },
      { productName: REFRESCO_A_ELEGIR, quantity: 6 },
    ],
  },
];

export function comboSizeLabel(size: ComboSize): string {
  if (size === 1) return '1 persona';
  if (size === 2) return '2 personas';
  return '4–6 personas';
}

export function getComboById(id: string): MenuCombo | undefined {
  return MENU_COMBOS.find((c) => c.id === id);
}
