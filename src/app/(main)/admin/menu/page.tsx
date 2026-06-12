'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Pencil, Plus, Trash2 } from 'lucide-react';

type ProductRow = {
  id: number;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  active: number;
};

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

  function load() {
    fetch('/api/products?all=1')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      });
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
    const method = editingId ? 'PATCH' : 'POST';
    const body = editingId ? { id: editingId, ...form } : form;
    const res = await fetch('/api/products', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message || 'Error al guardar');
      return;
    }
    setMessage(editingId ? 'Producto actualizado' : 'Producto creado');
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  }

  async function deactivate(id: number) {
    if (!confirm('¿Desactivar este producto del menú?')) return;
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Producto desactivado');
      load();
    }
  }

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🍔"
        title="Editar menú"
        subtitle="Agrega, modifica o desactiva platillos"
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={startNew} className="btn-food flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={16} /> Nuevo platillo
        </button>
      </div>

      {message && <div className="food-alert px-4 py-2 text-sm">{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="food-panel grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-food-muted">Nombre</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="food-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-food-muted">Subtítulo</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="food-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-food-muted">Categoría</label>
            <input
              required
              list="categories"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="food-input w-full"
            />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs text-food-muted">Precio</label>
            <input
              type="number"
              required
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="food-input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-food-muted">Costo</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              className="food-input w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-food-muted">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="food-input w-full min-h-[80px]"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className="btn-food px-4 py-2 text-sm">
              {editingId ? 'Guardar cambios' : 'Crear platillo'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="btn-food-outline px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="food-panel overflow-x-auto">
        <table className="food-table w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left">Platillo</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Costo</th>
              <th className="px-4 py-3 text-center">Activo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-cream">{p.name}</p>
                  {p.subtitle && <p className="text-xs text-food-muted">{p.subtitle}</p>}
                </td>
                <td className="px-4 py-3 text-food-muted">{p.category}</td>
                <td className="food-price px-4 py-3 text-right">${p.price}</td>
                <td className="px-4 py-3 text-right text-food-muted">${p.cost}</td>
                <td className="px-4 py-3 text-center">{p.active ? '✓' : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="rounded border border-food-border p-1.5 text-mustard hover:border-mustard">
                      <Pencil size={14} />
                    </button>
                    {p.active > 0 && (
                      <button
                        type="button"
                        onClick={() => deactivate(p.id)}
                        className="rounded border border-food-border p-1.5 text-ketchup hover:border-ketchup">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
