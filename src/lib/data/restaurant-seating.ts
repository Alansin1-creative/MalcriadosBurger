/** Lugares del local — 1 mesa de salón + 4 bancos en barra */
export const RESTAURANT_SEATING = [
  { name: 'Mesa 1', capacity: 6, zone: 'Salón' },
  { name: 'Banco 1', capacity: 1, zone: 'Barra' },
  { name: 'Banco 2', capacity: 1, zone: 'Barra' },
  { name: 'Banco 3', capacity: 1, zone: 'Barra' },
  { name: 'Banco 4', capacity: 1, zone: 'Barra' },
] as const;

export const SEATING_NAMES = RESTAURANT_SEATING.map((s) => s.name);
