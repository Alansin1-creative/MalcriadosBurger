'use client';

import { BusinessStatusToggle } from '@/components/BusinessStatusToggle';
import { PageHeader } from '@/components/PageHeader';
import { useRequireAuth } from '@/contexts/AuthContext';

export default function AdminDashboardPage() {
  useRequireAuth();
  return (
    <div className="space-y-6">
      <PageHeader emoji="👑" title="Panel admin" subtitle="Malcriados Burger — versión web" />
      <BusinessStatusToggle />
      <p className="text-sm text-food-muted">
        Usa el menú lateral para Cocina, Menú y estado del local.
      </p>
    </div>
  );
}
