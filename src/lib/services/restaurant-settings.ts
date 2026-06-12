import { getDb } from '../db';

const OPEN_KEY = 'is_open';

export function isRestaurantOpen(): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT value FROM restaurant_settings WHERE key = ?')
    .get(OPEN_KEY) as { value: string } | undefined;
  return row ? row.value === '1' : true;
}

export function setRestaurantOpen(open: boolean): { isOpen: boolean; updatedAt: string } {
  const db = getDb();
  const value = open ? '1' : '0';
  const updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    `INSERT INTO restaurant_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(OPEN_KEY, value, updatedAt);
  return { isOpen: open, updatedAt };
}

export function getRestaurantStatus(): { isOpen: boolean; updatedAt: string | null } {
  const db = getDb();
  const row = db
    .prepare('SELECT value, updated_at FROM restaurant_settings WHERE key = ?')
    .get(OPEN_KEY) as { value: string; updated_at: string } | undefined;
  return {
    isOpen: row ? row.value === '1' : true,
    updatedAt: row?.updated_at ?? null,
  };
}

export function assertRestaurantOpen(): void {
  if (!isRestaurantOpen()) {
    throw new Error('El negocio está cerrado. Abre el local para tomar pedidos.');
  }
}

export function assertRestaurantAcceptsOnlineOrders(): void {
  if (!isRestaurantOpen()) {
    throw new Error('El negocio está cerrado. No aceptamos pedidos en línea por ahora.');
  }
}
