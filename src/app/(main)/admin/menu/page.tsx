'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createProduct,
  deleteProduct,
  listAllProducts,
  updateProduct,
  type ProductRow,
} from '@/lib/firebase/products';

const emptyForm = {
  name: '',
  subtitle: '',
  category: 'Hamburguesas',
  price: 0,
  cost: 0,
  description: '',
  active: 1,
};

export default function AdminMenuPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const data = await listAllProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: ProductRow) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      subtitle: p.subtitle,
      category: p.category,
      price: p.price,
      cost: p.cost,
      description: p.description,
      active: p.active,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await createProduct(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
      setMessage('Guardado');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Desactivar este producto?')) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader emoji="🍔" title="Menú" subtitle="Productos del catálogo" />

      {message && <p className="text-sm text-mustard">{message}</p>}

      <button type="button" onClick={startNew} className="btn-food flex items-center gap-2 text-sm">
        <Plus size={16} /> Nuevo producto
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="food-panel space-y-3 p-4">
          <input
            className="food-input w-full"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="food-input w-full"
            placeholder="Subtítulo"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
          <input
            className="food-input w-full"
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="food-input w-full"
              placeholder="Precio"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
            <input
              type="number"
              className="food-input w-full"
              placeholder="Costo"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
            />
          </div>
          <textarea
            className="food-input w-full"
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-food text-sm">
              Guardar
            </button>
            <button
              type="button"
              className="btn-food-outline text-sm"
              onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {products.map((p) => (
          <div
            key={p.id}
            className="food-card flex items-center justify-between gap-3 p-3">
            <div>
              <p className="font-semibold text-cream">
                {p.name}{' '}
                {p.active !== 1 && <span className="text-xs text-ketchup">(inactivo)</span>}
              </p>
              <p className="text-xs text-food-muted">
                {p.category} · ${p.price}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(p)} className="text-mustard">
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => handleDelete(p.id)} className="text-ketchup">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
