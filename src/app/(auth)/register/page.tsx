'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { defaultPathForRole } from '@/contexts/AuthContext';
import { PasswordStrength } from '@/components/PasswordStrength';
import { PasswordField } from '@/components/PasswordField';
import { isPasswordStrong } from '@/lib/auth/password-policy';

type Step = 'form' | 'verify';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [phonePin, setPhonePin] = useState('');
  const [devHint, setDevHint] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!isPasswordStrong(password)) {
      setError('La contraseña no cumple los requisitos de seguridad');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Error al iniciar registro');
        return;
      }
      setSessionId(data.sessionId);
      setEmailMasked(data.emailMasked);
      setPhoneMasked(data.phoneMasked);
      setDevHint(data.devHint ?? '');
      setInfo('Te enviamos un código al correo y un NIP por SMS.');
      setStep('verify');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sessionId, emailCode, phonePin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Verificación fallida');
        return;
      }
      window.location.href = defaultPathForRole(data.user.role);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  async function resend(channel: 'email' | 'phone') {
    setError('');
    setInfo('');
    const res = await fetch('/api/auth/register/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, channel }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || 'No se pudo reenviar');
      return;
    }
    setInfo(channel === 'email' ? 'Código reenviado al correo' : 'NIP reenviado por SMS');
  }

  return (
    <div className="flex min-h-[calc(100vh-4px)] items-center justify-center p-4 pt-8">
      <div className="food-panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-mustard">
            🍔 Malcriados
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold text-cream">Crear cuenta</h1>
          <p className="mt-1 text-sm text-food-muted">
            {step === 'form'
              ? 'Verificamos tu correo y tu celular'
              : 'Ingresa los códigos que te enviamos'}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted">Nombre</label>
              <input
                type="text"
                required
                autoComplete="name"
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
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="food-input w-full"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted">Celular (México)</label>
              <input
                type="tel"
                required
                autoComplete="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="food-input w-full"
                placeholder="10 dígitos, ej. 5512345678"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted">Contraseña</label>
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="Contraseña segura"
              />
              <PasswordStrength password={password} />
            </div>
            {error && <div className="food-alert px-3 py-2 text-sm">{error}</div>}
            <button
              type="submit"
              disabled={loading || !isPasswordStrong(password)}
              className="btn-food w-full py-2.5 text-sm disabled:opacity-40">
              {loading ? 'Enviando códigos…' : 'Enviar códigos de verificación'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-food-muted">
              Correo: <span className="text-cream">{emailMasked}</span>
              <br />
              Celular: <span className="text-cream">{phoneMasked}</span>
            </p>
            {devHint && (
              <p className="rounded-lg border border-mustard/40 bg-mustard/10 px-3 py-2 text-xs text-mustard-light">
                {devHint}
              </p>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted">
                Código del correo (6 dígitos)
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="food-input w-full text-center text-lg tracking-[0.3em]"
                placeholder="000000"
              />
              <button
                type="button"
                onClick={() => resend('email')}
                className="mt-1 text-xs text-mustard hover:underline">
                Reenviar código al correo
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-food-muted">
                NIP del celular (6 dígitos)
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={phonePin}
                onChange={(e) => setPhonePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="food-input w-full text-center text-lg tracking-[0.3em]"
                placeholder="000000"
              />
              <button
                type="button"
                onClick={() => resend('phone')}
                className="mt-1 text-xs text-mustard hover:underline">
                Reenviar NIP por SMS
              </button>
            </div>
            {info && (
              <p className="text-sm text-emerald-400">{info}</p>
            )}
            {error && <div className="food-alert px-3 py-2 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-food w-full py-2.5 text-sm">
              {loading ? 'Verificando…' : 'Confirmar y crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setEmailCode('');
                setPhonePin('');
                setError('');
              }}
              className="btn-food-outline w-full py-2 text-sm">
              Volver
            </button>
          </form>
        )}

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
