import { getDb } from '../db';
import {
  getModifierById,
  getTacoPieces,
  parseModifiersPayload,
} from '../data/product-modifiers';
import type { Ingredient } from '../types';

export function listIngredients(): Ingredient[] {
  const db = getDb();
  return db.prepare('SELECT * FROM ingredients ORDER BY name').all() as Ingredient[];
}

export function getLowStockIngredients(): Ingredient[] {
  return listIngredients().filter((i) => i.current_stock <= i.min_stock);
}

function deductIngredientByName(ingredientName: string, qty: number) {
  const db = getDb();
  const ing = db.prepare('SELECT id FROM ingredients WHERE name = ?').get(ingredientName) as
    | { id: number }
    | undefined;
  if (!ing) return;
  db.prepare(
    `UPDATE ingredients SET current_stock = CASE WHEN current_stock - ? < 0 THEN 0 ELSE current_stock - ? END WHERE id = ?`
  ).run(qty, qty, ing.id);
}

export function deductInventoryForOrder(orderId: number) {
  const db = getDb();
  const lines = db
    .prepare(
      `SELECT ol.product_id, ol.quantity, ol.modifiers_json, p.category
       FROM order_lines ol
       JOIN products p ON p.id = ol.product_id
       WHERE ol.order_id = ?`
    )
    .all(orderId) as {
    product_id: number;
    quantity: number;
    modifiers_json: string;
    category: string;
  }[];

  const recipeStmt = db.prepare(
    'SELECT ingredient_id, quantity, i.name as ingredient_name FROM recipe_lines rl JOIN ingredients i ON i.id = rl.ingredient_id WHERE rl.product_id = ?'
  );
  const updateStmt = db.prepare(
    `UPDATE ingredients SET current_stock = CASE WHEN current_stock - ? < 0 THEN 0 ELSE current_stock - ? END WHERE id = ?`
  );

  const tx = db.transaction(() => {
    for (const line of lines) {
      const payload = parseModifiersPayload(JSON.parse(line.modifiers_json || '[]'));
      const tacoFactor = line.category === 'Tacos' ? getTacoPieces(payload) / 4 : 1;

      const recipes = recipeStmt.all(line.product_id) as {
        ingredient_id: number;
        quantity: number;
        ingredient_name: string;
      }[];
      for (const r of recipes) {
        const qty = r.quantity * tacoFactor * line.quantity;
        updateStmt.run(qty, qty, r.ingredient_id);
      }

      for (const extra of payload.extras) {
        if (extra.qty <= 0) continue;
        const mod = getModifierById(extra.id, line.category);
        if (!mod) continue;
        for (const [ingName, ingQty] of mod.ingredients) {
          deductIngredientByName(ingName, ingQty * extra.qty * line.quantity);
        }
      }
    }
  });
  tx();
}

export function addStockFromPurchase(
  ingredientId: number,
  quantity: number,
  unitCost?: number
) {
  const db = getDb();
  if (unitCost !== undefined) {
    db.prepare(
      'UPDATE ingredients SET current_stock = current_stock + ?, unit_cost = ? WHERE id = ?'
    ).run(quantity, unitCost, ingredientId);
  } else {
    db.prepare('UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?').run(
      quantity,
      ingredientId
    );
  }
}

export function findIngredientByName(name: string): Ingredient | undefined {
  const normalized = name.trim().toLowerCase();
  const all = listIngredients();
  return all.find((i) => i.name.toLowerCase().includes(normalized) || normalized.includes(i.name.toLowerCase()));
}
