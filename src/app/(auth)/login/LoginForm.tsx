'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { defaultPathForRole } from '@/contexts/AuthContext';
import { PasswordField } from '@/components/PasswordField';
import { signIn } from '@/lib/firebase/auth';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn(email, password);
      const next = searchParams.get('next');
      const dest =
        next && next !== '/login' && next !== '/register'
          ? next
          : defaultPathForRole(user.role);
      window.location.href = dest;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        setError('Correo o contraseña incorrectos');
      } else if (message.includes('auth/user-not-found')) {
        setError('Correo o contraseña incorrectos');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4px)] items-center justify-center p-4 pt-8">
      <div className="food-panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-mustard">
            🌭 Malcriados
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold text-cream">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-food-muted">Accede para pedir o administrar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted">Correo</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="food-input w-full"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted">Contraseña</label>
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="food-alert px-3 py-2 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="btn-food w-full py-2.5 text-sm">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-food-muted">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-mustard hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
