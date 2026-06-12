'use client';

import { useAuth } from '@/contexts/AuthContext';
import { OrderEditGuardProvider } from '@/contexts/OrderEditGuardContext';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHomePage =
    pathname === '/inicio' || (user?.role === 'admin' && pathname === '/');

  function handleBack() {
    if (user?.role === 'client') {
      router.push('/inicio');
      return;
    }
    router.push('/');
  }

  useEffect(() => {
    if (loading || user) return;
    const next = encodeURIComponent(pathname);
    window.location.replace(`/login?next=${next}`);
  }, [loading, user, pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onResize = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onResize);
    return () => mq.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-diner-bg text-cream">
        <p className="text-food-muted">Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-diner-bg text-cream">
        <p className="text-food-muted">Redirigiendo al login…</p>
      </div>
    );
  }

  return (
    <OrderEditGuardProvider>
    <div className="min-h-screen text-cream">
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div className="flex min-h-screen">
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] transform transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <Sidebar
            user={user}
            onLogout={logout}
            showCloseMobile
            onClose={() => setMenuOpen(false)}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppHeader
            pathname={pathname}
            isHomePage={isHomePage}
            onMenuOpen={() => setMenuOpen(true)}
            onBack={handleBack}
          />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </OrderEditGuardProvider>
  );
}
