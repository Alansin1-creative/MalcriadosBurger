import { getDb } from '../db';
import { CANONICAL_PRODUCTS } from '../data/malcriados-menu';

/** Inserta o actualiza platillos del menú canónico en la DB. */
export function ensureMenuProducts() {
  const db = getDb();

  const insert = db.prepare(
    `INSERT INTO products (name, subtitle, category, price, cost, description, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  );

  const update = db.prepare(
    `UPDATE products SET subtitle = ?, category = ?, price = ?, cost = ?, description = ?, active = 1
     WHERE name = ?`
  );

  const find = db.prepare('SELECT id FROM products WHERE name = ?');

  for (const p of CANONICAL_PRODUCTS) {
    const row = find.get(p.name) as { id: number } | undefined;
    if (row) {
      update.run(p.subtitle, p.category, p.price, p.cost, p.description, p.name);
    } else {
      insert.run(p.name, p.subtitle, p.category, p.price, p.cost, p.description);
    }
  }
}
