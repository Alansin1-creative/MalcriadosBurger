'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { defaultPathForRole } from '@/contexts/AuthContext';
import { PasswordField } from '@/components/PasswordField';

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      let data: { message?: string; user?: { role: 'client' | 'admin' } } = {};
      try {
        data = await res.json();
      } catch {
        setError('No se pudo conectar con el servidor');
        return;
      }
      if (!res.ok) {
        setError(data.message || 'Error al iniciar sesión');
        return;
      }
      if (!data.user) {
        setError('Respuesta inválida del servidor');
        return;
      }

      const next = searchParams.get('next');
      const dest =
        next && next !== '/login' && next !== '/register'
          ? next
          : defaultPathForRole(data.user.role);

      // Recarga completa para que el navegador aplique las cookies de sesión
      window.location.href = dest;
    } catch {
      setError('No se pudo conectar con el servidor');
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
