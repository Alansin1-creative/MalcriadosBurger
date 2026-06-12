import bcrypt from 'bcryptjs';
import { getDb } from './db';
import {
  MENU_PRODUCTS,
  INGREDIENTS,
  RECIPES,
  RESTAURANT,
} from './data/malcriados-menu';
import { RESTAURANT_SEATING } from './data/restaurant-seating';

function clearAll(db: ReturnType<typeof getDb>) {
  db.exec(`
    DELETE FROM purchase_lines;
    DELETE FROM purchase_tickets;
    DELETE FROM order_lines;
    DELETE FROM orders;
    DELETE FROM recipe_lines;
    DELETE FROM products;
    DELETE FROM ingredients;
    DELETE FROM tables;
  `);
}

export function seedMalcriados(force = false) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
  if (count.c > 0 && !force) return false;

  if (force) clearAll(db);

  const insertTable = db.prepare(
    'INSERT INTO tables (name, capacity, status, zone) VALUES (?, ?, ?, ?)'
  );
  for (const t of RESTAURANT_SEATING) {
    insertTable.run(t.name, t.capacity, 'free', t.zone);
  }

  const insertProduct = db.prepare(
    'INSERT INTO products (name, subtitle, category, price, cost, description, active) VALUES (?, ?, ?, ?, ?, ?, 1)'
  );
  const productIdByName: Record<string, number> = {};
  for (const p of MENU_PRODUCTS) {
    const r = insertProduct.run(
      p.name,
      p.subtitle,
      p.category,
      p.price,
      p.cost,
      p.description
    );
    productIdByName[p.name] = Number(r.lastInsertRowid);
  }

  const insertIng = db.prepare(
    'INSERT INTO ingredients (name, unit, min_stock, current_stock, unit_cost, supplier) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const ingIdByName: Record<string, number> = {};
  for (const row of INGREDIENTS) {
    const r = insertIng.run(...row);
    ingIdByName[row[0]] = Number(r.lastInsertRowid);
  }

  const insertRecipe = db.prepare(
    'INSERT INTO recipe_lines (product_id, ingredient_id, quantity) VALUES (?, ?, ?)'
  );
  for (const [productName, lines] of Object.entries(RECIPES)) {
    const pid = productIdByName[productName];
    if (!pid) continue;
    for (const [ingName, qty] of lines) {
      const iid = ingIdByName[ingName];
      if (iid) insertRecipe.run(pid, iid, qty);
    }
  }

  const pid = (name: string) => productIdByName[name];
  const now = new Date();
  const insertOrder = db.prepare(
    `INSERT INTO orders (table_id, status, subtotal, tax, total, created_at, paid_at)
     VALUES (?, 'paid', ?, ?, ?, ?, ?)`
  );
  const insertLine = db.prepare(
    'INSERT INTO order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)'
  );

  const priceMap = Object.fromEntries(
    MENU_PRODUCTS.map((p) => [productIdByName[p.name], p.price])
  );

  const salesPatterns: { daysAgo: number; items: [string, number][] }[] = [
    { daysAgo: 7, items: [['El Malcriado Clásico', 18], ['Patín de Papas', 12], ['Dogo Quesabroso', 8]] },
    { daysAgo: 6, items: [['Tripitas del Barrio', 10], ['Pulpo Salchichero', 6], ['Cuatro Bisteces', 5]] },
    { daysAgo: 5, items: [['Doble Pecado', 14], ['Papas Quesabrosas', 9], ['Dogo Aloha Malcriado', 7]] },
    { daysAgo: 4, items: [['Monstruo Malcriado', 4], ['Tocino sin Freno', 11], ['Aros Fundidos', 8]] },
    { daysAgo: 3, items: [['El Malcriado Clásico', 16], ['Cuatro Tripas', 6], ['Patín de Papas', 15]] },
    { daysAgo: 2, items: [['Hawai sin Modales', 9], ['Dogo Tripón', 8], ['Bistec Encebollado x4', 7]] },
    { daysAgo: 1, items: [['Champiñón Desobediente', 10], ['Papas Quesabrosas', 11], ['El Malcriado Clásico', 12]] },
    { daysAgo: 0, items: [['El Malcriado Clásico', 6], ['Patín de Papas', 8], ['Dogo Patín', 4]] },
    { daysAgo: 14, items: [['Doble Pecado', 12], ['Pulpo Salchichero', 5]] },
    { daysAgo: 12, items: [['La Encerrada', 5], ['Tocino sin Freno', 9]] },
    { daysAgo: 10, items: [['Cuatro Bisteces', 8], ['Tripitas del Barrio', 7], ['Aros del Apocalipsis', 6]] },
    { daysAgo: 21, items: [['El Malcriado Clásico', 20], ['Patín de Papas', 14], ['Dogo Quesabroso', 10]] },
    { daysAgo: 18, items: [['Doble Pecado', 11], ['La Malcriada', 4]] },
  ];

  for (const sale of salesPatterns) {
    const d = new Date(now);
    d.setDate(d.getDate() - sale.daysAgo);
    d.setHours(13 + (sale.daysAgo % 6), 0, 0, 0);
    const created = d.toISOString();
    let subtotal = 0;
    const lineItems: [number, number, number][] = [];
    for (const [name, qty] of sale.items) {
      const productId = pid(name);
      const unitPrice = priceMap[productId];
      subtotal += unitPrice * qty;
      lineItems.push([productId, qty, unitPrice]);
    }
    const tax = 0;
    const total = subtotal;
    const tableId = (sale.daysAgo % RESTAURANT_SEATING.length) + 1;
    const result = insertOrder.run(tableId, subtotal, tax, total, created, created);
    const orderId = result.lastInsertRowid;
    for (const [productId, qty, unitPrice] of lineItems) {
      insertLine.run(orderId, productId, qty, unitPrice, unitPrice * qty);
    }
  }

  const sencilla = pid('El Malcriado Clásico');
  const papas = pid('Patín de Papas');
  db.prepare(
    `INSERT INTO orders (table_id, status, subtotal, tax, total, created_at)
     VALUES (3, 'open', 155, 24.8, 179.8, datetime('now'))`
  ).run();
  const openOrderId = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
  insertLine.run(openOrderId.id, sencilla, 2, 55, 110);
  insertLine.run(openOrderId.id, papas, 1, 45, 45);

  console.log(`[seed] ${RESTAURANT.name}: ${MENU_PRODUCTS.length} productos cargados`);
  return true;
}

export function seedIfEmpty() {
  const seeded = seedMalcriados(false);
  seedAdminUserSync();
  return seeded;
}

function seedAdminUserSync() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c > 0) return;

  const email = (process.env.ADMIN_EMAIL ?? 'admin@malcriados.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO users (email, password_hash, name, role, email_verified, phone_verified)
     VALUES (?, ?, ?, ?, 1, 1)`
  ).run(email, hash, 'Administrador', 'admin');
  console.log(`[seed] Admin creado: ${email}`);
}
