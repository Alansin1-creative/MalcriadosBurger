'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  unit_cost: number;
  supplier: string;
}

export default function InventarioPage() {
  const [items, setItems] = useState<Ingredient[]>([]);

  useEffect(() => {
    fetch('/api/inventory').then((r) => r.json()).then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📦"
        title="Despensa"
        subtitle="Stock que se descuenta al cobrar en caja"
      />

      <div className="-mx-1 overflow-x-auto rounded-xl border border-food-border sm:mx-0">
        <table className="food-table w-full text-left text-sm">
          <thead className="border-b border-food-border">
            <tr>
              <th className="px-4 py-3">Ingrediente</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Costo/u</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const low = i.current_stock <= i.min_stock;
              const pct = i.min_stock > 0 ? (i.current_stock / i.min_stock) * 100 : 100;
              return (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium text-cream">{i.name}</td>
                  <td className="px-4 py-3">
                    {i.current_stock} {i.unit}
                  </td>
                  <td className="px-4 py-3 text-food-muted">
                    {i.min_stock} {i.unit}
                  </td>
                  <td className="px-4 py-3 food-price">${i.unit_cost}</td>
                  <td className="px-4 py-3 text-food-muted">{i.supplier}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        low
                          ? 'bg-ketchup/30 text-cream'
                          : pct < 150
                            ? 'bg-mustard/25 text-mustard-light'
                            : 'bg-mustard/10 text-mustard'
                      }`}>
                      {low ? 'Bajo' : pct < 150 ? 'Atención' : 'OK'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
