import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init';
import { getProductDescription, getProductSubtitle } from '@/lib/data/malcriados-menu';
import { requireAdmin, requireAuth, authErrorResponse } from '@/lib/auth/guards';
import {
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/services/products';

function enrichProducts(
  products: {
    id: number;
    name: string;
    subtitle?: string;
    category: string;
    price: number;
    cost: number;
    description?: string;
    active?: number;
  }[]
) {
  return products.map((p) => ({
    ...p,
    subtitle: getProductSubtitle(p.name, p.subtitle ?? ''),
    description: getProductDescription(p.name, p.description ?? ''),
  }));
}

export async function GET(request: Request) {
  ensureInitialized();
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';

    if (all) {
      await requireAdmin();
      return NextResponse.json(enrichProducts(listAllProducts()));
    }

    const db = getDb();
    const products = db
      .prepare('SELECT * FROM products WHERE active = 1 ORDER BY category, name')
      .all() as Parameters<typeof enrichProducts>[0];

    return NextResponse.json(enrichProducts(products));
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const body = await request.json();
    const id = createProduct(body);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, ...patch } = body;
    if (!id) {
      return NextResponse.json({ ok: false, message: 'id requerido' }, { status: 400 });
    }
    updateProduct(Number(id), patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  ensureInitialized();
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, message: 'id requerido' }, { status: 400 });
    }
    deleteProduct(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
