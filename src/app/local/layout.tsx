'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';

export default function LocalLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-diner-bg text-cream">
        <p className="text-food-muted">Cargando…</p>
      </div>
    );
  }

  if (user) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <div className="min-h-screen bg-diner-bg text-cream">
      <div className="diner-awning" />
      <div className="px-4 py-8 sm:py-10">{children}</div>
    </div>
  );
}
