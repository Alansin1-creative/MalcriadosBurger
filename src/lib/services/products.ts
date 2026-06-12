import { getDb } from '../db';

export type ProductInput = {
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  cost?: number;
  description?: string;
  active?: number;
};

export function listAllProducts() {
  const db = getDb();
  return db
    .prepare('SELECT * FROM products ORDER BY category, name')
    .all() as {
    id: number;
    name: string;
    subtitle: string;
    category: string;
    price: number;
    cost: number;
    description: string;
    active: number;
  }[];
}

export function createProduct(input: ProductInput) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO products (name, subtitle, category, price, cost, description, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name.trim(),
      input.subtitle?.trim() ?? '',
      input.category.trim(),
      input.price,
      input.cost ?? 0,
      input.description?.trim() ?? '',
      input.active ?? 1
    );
  return Number(result.lastInsertRowid);
}

export function updateProduct(id: number, input: Partial<ProductInput>) {
  const db = getDb();
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!current) throw new Error('Producto no encontrado');

  const row = current as ProductInput & { id: number };
  db.prepare(
    `UPDATE products SET name = ?, subtitle = ?, category = ?, price = ?, cost = ?, description = ?, active = ?
     WHERE id = ?`
  ).run(
    input.name?.trim() ?? row.name,
    input.subtitle?.trim() ?? row.subtitle ?? '',
    input.category?.trim() ?? row.category,
    input.price ?? row.price,
    input.cost ?? row.cost ?? 0,
    input.description?.trim() ?? row.description ?? '',
    input.active ?? (row as { active: number }).active ?? 1,
    id
  );
}

export function deleteProduct(id: number) {
  const db = getDb();
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id);
}
