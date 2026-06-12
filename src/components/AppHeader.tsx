'use client';

import { ArrowLeft, Menu } from 'lucide-react';
import { getPageTitle } from '@/lib/page-titles';

const BRAND = 'Malcriados Burger & Dogos';
const TAGLINE = '🍔 Hamburguesas, Tacos, Dogos y algo más';

interface AppHeaderProps {
  pathname: string;
  isHomePage: boolean;
  onMenuOpen: () => void;
  onBack: () => void;
}

export function AppHeader({ pathname, isHomePage, onMenuOpen, onBack }: AppHeaderProps) {
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="app-header sticky top-0 z-30 shrink-0">
      <div className="diner-awning shrink-0" />
      <div className="flex h-14 items-center gap-3 border-b border-food-border bg-diner-surface/95 px-4 shadow-lg backdrop-blur-sm">
        <div className="flex w-10 shrink-0 justify-start lg:w-0 lg:overflow-hidden">
          {isHomePage ? (
            <button
              type="button"
              onClick={onMenuOpen}
              className="app-header-btn lg:hidden"
              aria-label="Abrir menú">
              <Menu size={22} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="app-header-btn lg:hidden"
              aria-label="Volver">
              <ArrowLeft size={22} />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center lg:text-left">
          {isHomePage ? (
            <>
              <p className="truncate font-display text-sm font-bold leading-tight text-cream">
                {BRAND}
              </p>
              <p className="truncate font-display text-[10px] font-medium leading-tight text-mustard">
                {TAGLINE}
              </p>
            </>
          ) : (
            <>
              <p className="truncate font-display text-sm font-bold leading-tight text-cream">
                {pageTitle}
              </p>
              <p className="truncate text-[10px] text-food-muted">{BRAND}</p>
            </>
          )}
        </div>

        <div className="w-10 shrink-0 lg:w-0" aria-hidden />
      </div>
    </header>
  );
}
