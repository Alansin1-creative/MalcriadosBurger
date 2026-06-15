'use client';

import { FormEvent, useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { useRequireAuth } from '@/contexts/AuthContext';
import { formatMexicanPhone, normalizeMexicanPhone, validateMexicanPhone } from '@/lib/auth/phone-validation';
import { userCanPlaceOrders, missingOrderContactMessage } from '@/lib/auth/client-profile';
import { getClientDb } from '@/lib/firebase/config';

export default function PerfilPage() {
  const { user, refresh } = useRequireAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ? formatMexicanPhone(user.phone) : '');
  }, [user]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMessage('');
    const phoneError = validateMexicanPhone(phone);
    if (phoneError) {
      setMessage(phoneError);
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(getClientDb(), 'profiles', user.uid), {
        name: name.trim(),
        phone: normalizeMexicanPhone(phone),
      });
      await refresh();
      setMessage('Perfil actualizado');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const canOrder = userCanPlaceOrders({ email: user.email, phone: user.phone });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader emoji="👤" title="Mi perfil" subtitle={user.email} />
      {!canOrder && (
        <p className="food-alert text-sm">
          {missingOrderContactMessage({ email: user.email, phone: user.phone })}
        </p>
      )}
      <form onSubmit={handleSave} className="food-panel space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs text-food-muted">Nombre</label>
          <input
            className="food-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-food-muted">Celular</label>
          <input
            className="food-input w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        {message && <p className="text-sm text-mustard">{message}</p>}
        <button type="submit" disabled={saving} className="btn-food w-full text-sm">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
