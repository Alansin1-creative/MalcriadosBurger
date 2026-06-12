'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';

interface Recipe {
  id: number;
  name: string;
  subtitle?: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  description?: string;
  ingredients: { ingredient_name: string; quantity: number; unit: string }[];
}

export default function RecetasPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetch('/api/recipes').then((r) => r.json()).then(setRecipes);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="👨‍🍳"
        title="Recetas de cocina"
        subtitle="Qué lleva cada platillo y cuánto te cuesta"
      />

      <div className="grid gap-4">
        {recipes.map((r) => (
          <div key={r.id} className="food-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-cream">{r.name}</h2>
                {r.subtitle && <p className="food-subtitle">{r.subtitle}</p>}
                <p className="text-sm text-food-muted">{r.category}</p>
                {r.description && <p className="food-note mt-1 max-w-xl">{r.description}</p>}
              </div>
              <div className="text-right text-sm">
                <p className="food-price">Precio: ${r.price}</p>
                <p className="text-food-muted">Costo: ${r.cost}</p>
                <p className="font-medium text-cream">Margen: {r.margin.toFixed(1)}%</p>
              </div>
            </div>
            {r.ingredients.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {r.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="rounded-full border border-food-border bg-diner-card px-3 py-1 text-xs text-cream/90">
                    {ing.quantity} {ing.unit} {ing.ingredient_name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-food-muted">Sin receta registrada</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
