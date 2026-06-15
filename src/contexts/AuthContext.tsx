'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/lib/types';
import { defaultPathForRole, isAdminPath, isAuthPath } from '@/lib/auth/routes';
import { signOutUser, subscribeAuth, getUserProfile, profileToSessionUser } from '@/lib/firebase/auth';
import { getClientAuth } from '@/lib/firebase/config';

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const fbUser = getClientAuth().currentUser;
    if (!fbUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await getUserProfile(fbUser.uid);
    if (!profile || profile.active !== 1) {
      setUser(null);
    } else {
      setUser(profileToSessionUser(profile));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    const path = window.location.pathname;
    if (isAuthPath(path)) return;

    if (user.role === 'client' && isAdminPath(path)) {
      router.replace('/inicio');
    }
  }, [user, loading, router]);

  const logout = useCallback(async () => {
    await signOutUser();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.push('/login');
    }
  }, [auth.loading, auth.user, router]);

  return auth;
}

export { defaultPathForRole };
