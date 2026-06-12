'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { User, UserRole } from '@/lib/types';

export default function AdminCuentasPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(id: number, patch: Partial<{ role: UserRole; active: number }>) {
    setMessage('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message || 'Error al actualizar');
      return;
    }
    setMessage('Usuario actualizado');
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="👥"
        title="Cuentas de usuarios"
        subtitle="Administra clientes y administradores"
      />

      {message && <div className="food-alert px-4 py-2 text-sm">{message}</div>}

      {loading ? (
        <p className="text-food-muted">Cargando…</p>
      ) : (
        <div className="food-panel overflow-x-auto">
          <table className="food-table w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Correo</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-cream">{u.name}</td>
                  <td className="px-4 py-3 text-food-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        updateUser(u.id, { role: e.target.value as UserRole })
                      }
                      className="food-input text-xs">
                      <option value="client">Cliente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => updateUser(u.id, { active: u.active ? 0 : 1 })}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.active
                          ? 'bg-emerald-900/20 text-emerald-200'
                          : 'bg-ketchup/20 text-ketchup'
                      }`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-food-muted">
                    {new Date(u.created_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
