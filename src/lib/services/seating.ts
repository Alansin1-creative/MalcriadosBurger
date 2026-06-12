import { getDb } from '../db';
import { RESTAURANT_SEATING, SEATING_NAMES } from '../data/restaurant-seating';
import type { Table, TableStatus } from '../types';

export function ensureSeatingLayout() {
  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO tables (name, capacity, status, zone) VALUES (?, ?, ?, ?)'
  );

  for (const seat of RESTAURANT_SEATING) {
    const exists = db.prepare('SELECT id FROM tables WHERE name = ?').get(seat.name) as
      | { id: number }
      | undefined;
    if (!exists) {
      insert.run(seat.name, seat.capacity, 'free', seat.zone);
    } else {
      db.prepare('UPDATE tables SET capacity = ?, zone = ? WHERE name = ?').run(
        seat.capacity,
        seat.zone,
        seat.name
      );
    }
  }

  const placeholders = SEATING_NAMES.map(() => '?').join(',');
  const extras = db
    .prepare(
      `SELECT t.id FROM tables t
       WHERE t.name NOT IN (${placeholders})
         AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.table_id = t.id)`
    )
    .all(...SEATING_NAMES) as { id: number }[];

  for (const row of extras) {
    db.prepare('DELETE FROM tables WHERE id = ?').run(row.id);
  }
}

export function listRestaurantSeating(): Table[] {
  const db = getDb();
  const placeholders = SEATING_NAMES.map(() => '?').join(',');
  return db
    .prepare(
      `SELECT * FROM tables
       WHERE name IN (${placeholders})
       ORDER BY CASE zone WHEN 'Salón' THEN 0 ELSE 1 END, id`
    )
    .all(...SEATING_NAMES) as Table[];
}

export function isSeatAvailable(status: TableStatus): boolean {
  return status === 'free';
}

export function allSeatsAvailable(seats: Table[]): boolean {
  return seats.length > 0 && seats.every((s) => isSeatAvailable(s.status));
}

export function getSeatById(tableId: number): Table | undefined {
  return listRestaurantSeating().find((s) => s.id === tableId);
}

export function assertSeatAssignable(tableId: number) {
  const seat = getSeatById(tableId);
  if (!seat) throw new Error('Asiento no encontrado');
  if (!isSeatAvailable(seat.status)) throw new Error('Ese asiento ya no está libre');
  return seat;
}

export function seatingSummary(seats: Table[], restaurantOpen = true) {
  if (!restaurantOpen) {
    return {
      isOpen: false,
      seats,
      availableCount: 0,
      totalCount: seats.length,
      hasTableFree: false,
      barStoolsFree: 0,
    };
  }

  const available = seats.filter((s) => isSeatAvailable(s.status));
  return {
    isOpen: true,
    seats,
    availableCount: available.length,
    totalCount: seats.length,
    hasTableFree: seats.some((s) => s.zone === 'Salón' && isSeatAvailable(s.status)),
    barStoolsFree: seats.filter((s) => s.zone === 'Barra' && isSeatAvailable(s.status)).length,
  };
}
