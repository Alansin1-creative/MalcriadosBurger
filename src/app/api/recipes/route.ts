import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init';
import { requireAdmin, authErrorResponse } from '@/lib/auth/guards';
import { getProductDescription, getProductSubtitle } from '@/lib/data/malcriados-menu';

export async function GET() {
  ensureInitialized();
  try {
    await requireAdmin();
  const db = getDb();
  const products = db
    .prepare('SELECT id, name, subtitle, category, price, cost, description FROM products WHERE active = 1')
    .all() as {
    id: number;
    name: string;
    subtitle?: string;
    category: string;
    price: number;
    cost: number;
    description?: string;
  }[];

  const recipeStmt = db.prepare(
    `SELECT rl.*, i.name as ingredient_name, i.unit
     FROM recipe_lines rl
     JOIN ingredients i ON i.id = rl.ingredient_id
     WHERE rl.product_id = ?
     ORDER BY
       CASE i.name
         WHEN 'Pan hot dog' THEN 0
         WHEN 'Salchichas' THEN 1
         ELSE 2
       END,
       i.name`
  );

  const result = products.map((p) => ({
    ...p,
    subtitle: getProductSubtitle(p.name, p.subtitle ?? ''),
    description: getProductDescription(p.name, p.description ?? ''),
    margin: p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0,
    ingredients: recipeStmt.all(p.id),
  }));

  return NextResponse.json(result);
  } catch (err) {
    return authErrorResponse(err);
  }
}
