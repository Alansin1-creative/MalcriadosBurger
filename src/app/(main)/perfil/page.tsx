'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';

type Profile = {
  name: string;
  email: string;
  phone: string;
  canOrder: boolean;
};

type Step = 'form' | 'verify';

export default function PerfilPage() {
  const { refresh } = useRequireAuth();
  const auth = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [pin, setPin] = useState('');
  const [devHint, setDevHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setError(data.message || 'No se pudo cargar el perfil');
          return;
        }
        setProfile(data.profile);
        setName(data.profile.name);
        setPhone(data.profile.phoneRaw || data.profile.phone.replace(/\D/g, ''));
      })
      .catch(() => setError('No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile/confirm/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'No se pudo iniciar la confirmación');
        return;
      }
      setSessionId(data.sessionId);
      setPhoneMasked(data.phoneMasked);
      setDevHint(data.devHint ?? '');
      setPin('');
      setStep('verify');
      setMessage(`Te enviamos un NIP al celular ${data.phoneMasked}`);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile/confirm/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'NIP incorrecto');
        return;
      }
      setProfile(data.profile);
      setName(data.profile.name);
      setPhone(data.profile.phoneRaw || '');
      setStep('form');
      setMessage('Perfil actualizado.');
      await refresh();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  const canOrder = profile?.canOrder ?? auth.user?.canOrder ?? false;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <PageHeader
        centered
        emoji="👤"
        title="Mi perfil"
        subtitle={
          step === 'verify'
            ? 'Confirma con el NIP que enviamos a tu celular'
            : 'Datos de contacto para tus pedidos'
        }
      />

      {loading && <p className="text-center text-sm text-food-muted">Cargando…</p>}

      {!loading && step === 'form' && (
        <>
          {!canOrder && (
            <div className="rounded-lg border border-mustard/50 bg-mustard/10 px-4 py-3 text-center text-sm text-cream">
              Para hacer pedidos en línea necesitas tener{' '}
              <strong className="text-mustard-light">correo y celular</strong> en tu cuenta.
              {!phone.trim() && ' Agrega tu número abajo.'}
            </div>
          )}

          <form onSubmit={handleStart} className="food-panel w-full space-y-4 p-6 sm:p-8">
            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted" htmlFor="profile-name">
                Nombre
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="food-input w-full"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted" htmlFor="profile-email">
                Correo electrónico
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile?.email ?? auth.user?.email ?? ''}
                readOnly
                className="food-input w-full cursor-not-allowed opacity-70"
              />
              <p className="mt-1 text-xs text-food-muted">El correo no se puede cambiar aquí.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted" htmlFor="profile-phone">
                Celular (México)
              </label>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10 dígitos, ej. 6141234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="food-input w-full"
                required
              />
              <p className="mt-1 text-xs text-food-muted">
                Al guardar te enviamos un NIP de 6 dígitos para confirmar.
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-ketchup/40 bg-ketchup/10 px-3 py-2 text-sm text-ketchup-light">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-lg border border-mustard/40 bg-mustard/10 px-3 py-2 text-sm text-mustard-light">
                {message}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                disabled={saving}
                className="btn-food w-full py-2.5 text-sm sm:w-auto sm:px-6">
                {saving ? 'Enviando NIP…' : 'Guardar cambios'}
              </button>
              {canOrder && (
                <Link
                  href="/pedir"
                  className="btn-food-outline w-full py-2.5 text-center text-sm sm:w-auto sm:px-6">
                  Ir a pedir
                </Link>
              )}
            </div>
          </form>
        </>
      )}

      {!loading && step === 'verify' && (
        <form onSubmit={handleVerify} className="food-panel w-full space-y-4 p-6 sm:p-8">
          <p className="text-center text-sm text-food-muted">
            NIP enviado al celular <span className="text-cream">{phoneMasked}</span>
          </p>
          {devHint && (
            <p className="rounded-lg border border-mustard/40 bg-mustard/10 px-3 py-2 text-xs text-mustard-light">
              {devHint}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-food-muted" htmlFor="profile-pin">
              NIP de confirmación
            </label>
            <input
              id="profile-pin"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="food-input w-full text-center text-lg tracking-[0.4em]"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-ketchup/40 bg-ketchup/10 px-3 py-2 text-sm text-ketchup-light">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || pin.length !== 6}
              className="btn-food w-full py-2.5 text-sm disabled:opacity-50">
              {saving ? 'Confirmando…' : 'Confirmar cambios'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setError('');
                setMessage('');
                setPin('');
              }}
              className="btn-food-outline w-full py-2 text-sm">
              Volver a editar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
