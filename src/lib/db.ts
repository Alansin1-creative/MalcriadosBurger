import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATABASE_DIR
  ? path.resolve(process.env.DATABASE_DIR)
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'plan-ai.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'free',
      zone TEXT NOT NULL DEFAULT 'Salón'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL DEFAULT 'kg',
      min_stock REAL NOT NULL DEFAULT 5,
      current_stock REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      supplier TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS recipe_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      status TEXT NOT NULL DEFAULT 'open',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    );

    CREATE TABLE IF NOT EXISTS order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      modifiers_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier TEXT NOT NULL DEFAULT '',
      raw_text TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      ingredient_id INTEGER,
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      unit_cost REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (ticket_id) REFERENCES purchase_tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );

    CREATE TABLE IF NOT EXISTS sales_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      weather TEXT NOT NULL DEFAULT 'clear',
      local_event TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'client',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_lines_product ON order_lines(product_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  const productCols = database.prepare('PRAGMA table_info(products)').all() as { name: string }[];
  if (!productCols.some((c) => c.name === 'description')) {
    database.exec(`ALTER TABLE products ADD COLUMN description TEXT NOT NULL DEFAULT ''`);
  }
  if (!productCols.some((c) => c.name === 'subtitle')) {
    database.exec(`ALTER TABLE products ADD COLUMN subtitle TEXT NOT NULL DEFAULT ''`);
  }

  const lineCols = database.prepare('PRAGMA table_info(order_lines)').all() as { name: string }[];
  if (!lineCols.some((c) => c.name === 'display_name')) {
    database.exec(`ALTER TABLE order_lines ADD COLUMN display_name TEXT NOT NULL DEFAULT ''`);
  }
  if (!lineCols.some((c) => c.name === 'modifiers_json')) {
    database.exec(`ALTER TABLE order_lines ADD COLUMN modifiers_json TEXT NOT NULL DEFAULT '[]'`);
  }

  const orderCols = database.prepare('PRAGMA table_info(orders)').all() as { name: string }[];
  if (!orderCols.some((c) => c.name === 'user_id')) {
    database.exec(`ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)`);
  }
  if (!orderCols.some((c) => c.name === 'order_type')) {
    database.exec(`ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'pos'`);
  }
  if (!orderCols.some((c) => c.name === 'preparing_at')) {
    database.exec(`ALTER TABLE orders ADD COLUMN preparing_at TEXT`);
  }
  if (!orderCols.some((c) => c.name === 'served_at')) {
    database.exec(`ALTER TABLE orders ADD COLUMN served_at TEXT`);
  }
  if (!orderCols.some((c) => c.name === 'prep_seconds')) {
    database.exec(`ALTER TABLE orders ADD COLUMN prep_seconds INTEGER`);
  }
  if (!orderCols.some((c) => c.name === 'service_mode')) {
    database.exec(`ALTER TABLE orders ADD COLUMN service_mode TEXT`);
  }
  if (!orderCols.some((c) => c.name === 'payment_method')) {
    database.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT`);
  }
  if (!orderCols.some((c) => c.name === 'payment_status')) {
    database.exec(`ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'`);
  }
  if (!orderCols.some((c) => c.name === 'mp_preference_id')) {
    database.exec(`ALTER TABLE orders ADD COLUMN mp_preference_id TEXT`);
  }

  database.exec(
    `UPDATE orders SET preparing_at = created_at WHERE status = 'preparing' AND preparing_at IS NULL`
  );

  database.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`);

  database.exec(`
    CREATE TABLE IF NOT EXISTS restaurant_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO restaurant_settings (key, value) VALUES ('is_open', '1');
  `);

  const userCols = database.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  if (!userCols.some((c) => c.name === 'phone')) {
    database.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
  }
  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL`
  );
  if (!userCols.some((c) => c.name === 'email_verified')) {
    database.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`);
  }
  if (!userCols.some((c) => c.name === 'phone_verified')) {
    database.exec(`ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 1`);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS registration_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_code_hash TEXT NOT NULL,
      phone_code_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_registration_sessions_email ON registration_sessions(email);
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS profile_change_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      pending_name TEXT NOT NULL,
      pending_phone TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      verify_phone TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_profile_change_sessions_user ON profile_change_sessions(user_id);
  `);
}
