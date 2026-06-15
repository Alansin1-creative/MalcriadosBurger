'use client';

import { PageHeader } from '@/components/PageHeader';

export function StaticUnavailable({ feature }: { feature: string }) {
  return (
    <div className="space-y-4">
      <PageHeader emoji="🚧" title={feature} subtitle="No disponible en versión web" />
      <div className="food-panel p-6 text-center text-sm text-food-muted">
        Esta sección requiere funciones de servidor que no están en el despliegue estático.
        <p className="mt-3 text-cream">
          Disponible: login, menú, pedidos, cocina y administración de productos.
        </p>
      </div>
    </div>
  );
}
