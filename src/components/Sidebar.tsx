'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  ShoppingCart,
  Banknote,
  Grid3X3,
  Package,
  ChefHat,
  Flame,
  BarChart3,
  Bot,
  ScanLine,
  X,
  UtensilsCrossed,
  ClipboardList,
  Users,
  LogOut,
  User,
} from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { useOrderEditGuard } from '@/contexts/OrderEditGuardContext';

const adminNav = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/caja', label: 'Caja', icon: Banknote },
  { href: '/cocina', label: 'Cocina', icon: Flame },
  { href: '/mesas', label: 'Mesas y barra', icon: Grid3X3 },
  { href: '/inventario', label: 'Despensa', icon: Package },
  { href: '/recetas', label: 'Recetas', icon: ChefHat },
  { href: '/reportes', label: 'Ventas', icon: BarChart3 },
  { href: '/asistente', label: 'Asistente IA', icon: Bot },
  { href: '/ocr', label: 'Tickets OCR', icon: ScanLine },
  { href: '/admin/cuentas', label: 'Cuentas', icon: Users },
  { href: '/admin/menu', label: 'Editar menú', icon: UtensilsCrossed },
];

const clientNav = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/local', label: 'Comer en local', icon: Grid3X3 },
  { href: '/pedir', label: 'Hacer pedido', icon: ShoppingCart },
  { href: '/mis-pedidos', label: 'Mis pedidos', icon: ClipboardList },
  { href: '/perfil', label: 'Mi perfil', icon: User },
];

interface SidebarProps {
  user: SessionUser | null;
  onLogout?: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
  showCloseMobile?: boolean;
}

export function Sidebar({ user, onLogout, onNavigate, onClose, showCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { runGuards } = useOrderEditGuard();
  const nav = user?.role === 'admin' ? adminNav : clientNav;

  async function handleNavClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) {
    if (href === pathname) return;
    const ok = await runGuards();
    if (!ok) {
      e.preventDefault();
      return;
    }
    onNavigate?.();
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-food-border bg-diner-surface text-cream shadow-xl">
      <div className="diner-awning shrink-0" />
      <div className="hidden border-b border-food-border bg-gradient-to-b from-ketchup/20 to-transparent px-4 py-4 lg:block">
        <p className="font-display truncate text-sm font-bold leading-tight text-cream">
          Malcriados Burger & Dogos
        </p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-mustard">
          🍔 Hamburguesas, Tacos, Dogos y algo más
        </p>
        <p className="mt-1 text-[10px] text-food-muted">
          {user?.role === 'admin' ? 'Panel administrador' : 'Menú'}
        </p>
      </div>
      <div className="flex items-start justify-between border-b border-food-border px-4 py-3 lg:hidden">
        <div className="min-w-0">
          <p className="font-display text-xs font-bold text-mustard">Menú</p>
        </div>
        {showCloseMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-lg border border-food-border p-2 text-food-muted hover:border-mustard hover:text-cream lg:hidden"
            aria-label="Cerrar menú">
            <X size={22} />
          </button>
        )}
      </div>

      {user && (
        <div className="border-b border-food-border px-4 py-3">
          <p className="truncate text-sm font-medium text-cream">{user.name}</p>
          <p className="truncate text-xs text-food-muted">{user.email}</p>
          {user.role === 'client' && (
            <Link
              href="/perfil"
              onClick={(e) => void handleNavClick(e, '/perfil')}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-food-border px-2.5 py-1 text-xs font-medium text-mustard-light transition hover:border-mustard/50 hover:bg-diner-card">
              <User size={14} />
              Mi perfil
              {user.canOrder === false && (
                <span className="rounded bg-mustard/20 px-1.5 py-0.5 text-[10px] text-mustard">
                  incompleto
                </span>
              )}
            </Link>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => void handleNavClick(e, href)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition sm:py-2.5 ${
                active
                  ? 'border border-mustard/40 bg-ketchup/25 font-semibold text-mustard-light shadow-inner'
                  : 'text-food-muted hover:border hover:border-food-border hover:bg-diner-card hover:text-cream'
              }`}>
              <Icon size={18} className={`shrink-0 ${active ? 'text-mustard' : ''}`} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-food-border p-3">
        {onLogout && (
          <button
            type="button"
            onClick={async () => {
              const ok = await runGuards();
              if (ok) onLogout();
            }}
            className="btn-food-outline flex w-full items-center justify-center gap-2 py-2 text-sm">
            <LogOut size={16} />
            Cerrar sesión
          </button>
        )}
      </div>
    </aside>
  );
}
