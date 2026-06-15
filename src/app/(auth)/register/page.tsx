'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { defaultPathForRole } from '@/contexts/AuthContext';
import { PasswordStrength } from '@/components/PasswordStrength';
import { PasswordField } from '@/components/PasswordField';
import { isPasswordStrong } from '@/lib/auth/password-policy';
import { signUp } from '@/lib/firebase/auth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!isPasswordStrong(password)) {
      setError('La contraseña no cumple los requisitos de seguridad');
      return;
    }
    setLoading(true);
    try {
      const user = await signUp({ name, email, phone, password });
      window.location.href = defaultPathForRole(user.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse';
      if (message.includes('auth/email-already-in-use')) {
        setError('Ya existe una cuenta con ese correo');
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
          <h1 className="font-display mt-2 text-2xl font-bold text-cream">Crear cuenta</h1>
          <p className="mt-1 text-sm text-food-muted">Regístrate para pedir en línea</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="food-input w-full"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="food-input w-full"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted">Celular (10 dígitos)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="food-input w-full"
              placeholder="5512345678"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted">Contraseña</label>
            <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordStrength password={password} />
          </div>
          {error && <div className="food-alert px-3 py-2 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="btn-food w-full py-2.5 text-sm">
            {loading ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-food-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-mustard hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
