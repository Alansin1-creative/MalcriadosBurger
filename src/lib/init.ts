import { getDb } from './db';
import { seedIfEmpty } from './seed';
import { ensureSeatingLayout } from './services/seating';
import { ensureMenuProducts } from './services/menu-sync';

let initialized = false;

export function ensureInitialized() {
  if (initialized) return;

  getDb();
  try {
    seedIfEmpty();
  } catch (err) {
    console.error('[init] seedIfEmpty failed:', err);
  }
  try {
    ensureSeatingLayout();
  } catch (err) {
    console.error('[init] ensureSeatingLayout failed:', err);
  }
  try {
    ensureMenuProducts();
  } catch (err) {
    console.error('[init] ensureMenuProducts failed:', err);
  }
  initialized = true;
}
