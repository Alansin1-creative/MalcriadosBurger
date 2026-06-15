import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getClientDb } from './config';
import { nextNumericId } from './ids';

export type ProductRow = {
  id: number;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  active: number;
};

export type ProductInput = {
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  cost?: number;
  description?: string;
  active?: number;
};

export async function listAllProducts(): Promise<ProductRow[]> {
  const db = getClientDb();
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs
    .map((d) => d.data() as ProductRow)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function listActiveProducts(): Promise<ProductRow[]> {
  const all = await listAllProducts();
  return all.filter((p) => p.active === 1);
}

export async function getProductById(id: number): Promise<ProductRow | undefined> {
  const snap = await getDoc(doc(getClientDb(), 'products', String(id)));
  if (!snap.exists()) return undefined;
  return snap.data() as ProductRow;
}

export async function createProduct(input: ProductInput): Promise<number> {
  const id = await nextNumericId('products');
  const row: ProductRow = {
    id,
    name: input.name.trim(),
    subtitle: input.subtitle?.trim() ?? '',
    category: input.category.trim(),
    price: input.price,
    cost: input.cost ?? 0,
    description: input.description?.trim() ?? '',
    active: input.active ?? 1,
  };
  await setDoc(doc(getClientDb(), 'products', String(id)), row);
  return id;
}

export async function updateProduct(id: number, input: Partial<ProductInput>): Promise<void> {
  const current = await getProductById(id);
  if (!current) throw new Error('Producto no encontrado');
  await updateDoc(doc(getClientDb(), 'products', String(id)), {
    name: input.name?.trim() ?? current.name,
    subtitle: input.subtitle?.trim() ?? current.subtitle,
    category: input.category?.trim() ?? current.category,
    price: input.price ?? current.price,
    cost: input.cost ?? current.cost,
    description: input.description?.trim() ?? current.description,
    active: input.active ?? current.active,
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await updateDoc(doc(getClientDb(), 'products', String(id)), { active: 0 });
}
