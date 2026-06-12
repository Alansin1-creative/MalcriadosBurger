'use client';

import { createContext, useCallback, useContext, useRef } from 'react';

type GuardFn = () => Promise<boolean>;

type OrderEditGuardContextValue = {
  registerGuard: (guard: GuardFn) => () => void;
  runGuards: () => Promise<boolean>;
};

const OrderEditGuardContext = createContext<OrderEditGuardContextValue | null>(null);

export function OrderEditGuardProvider({ children }: { children: React.ReactNode }) {
  const guardsRef = useRef<Set<GuardFn>>(new Set());

  const registerGuard = useCallback((guard: GuardFn) => {
    guardsRef.current.add(guard);
    return () => {
      guardsRef.current.delete(guard);
    };
  }, []);

  const runGuards = useCallback(async () => {
    for (const guard of guardsRef.current) {
      if (!(await guard())) return false;
    }
    return true;
  }, []);

  return (
    <OrderEditGuardContext.Provider value={{ registerGuard, runGuards }}>
      {children}
    </OrderEditGuardContext.Provider>
  );
}

export function useOrderEditGuard() {
  const ctx = useContext(OrderEditGuardContext);
  if (!ctx) throw new Error('useOrderEditGuard must be used within OrderEditGuardProvider');
  return ctx;
}
