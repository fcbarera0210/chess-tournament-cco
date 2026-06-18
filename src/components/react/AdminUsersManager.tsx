import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

type AdminUser = { id: string; username: string; createdAt: string };

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionError, setActionError] = useState('');
  const { run, isLoading } = useAsyncAction();

  async function load() {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users ?? []);
    setCurrentUserId(data.currentUserId ?? '');
  }

  useEffect(() => {
    load();
  }, []);

  function clearMessages() {
    setError('');
    setSuccess('');
    setActionError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    await run('create', async () => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error');
        return;
      }
      setSuccess(`Usuario ${data.user.username} creado`);
      setUsername('');
      setPassword('');
      await load();
    });
  }

  async function handlePasswordChange(userId: string) {
    clearMessages();
    await run(`password:${userId}`, async () => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Error al cambiar contraseña');
        return;
      }
      setSuccess('Contraseña actualizada');
      setPasswordUserId(null);
      setNewPassword('');
    });
  }

  async function handleDelete(user: AdminUser) {
    if (
      !window.confirm(
        `¿Eliminar al administrador "${user.username}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    clearMessages();
    await run(`delete:${user.id}`, async () => {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Error al eliminar');
        return;
      }
      setSuccess(`Usuario ${user.username} eliminado`);
      if (passwordUserId === user.id) {
        setPasswordUserId(null);
        setNewPassword('');
      }
      await load();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display mb-4 text-lg font-bold">Cuentas activas</h2>
        {(error || success || actionError) && (
          <div className="mb-4 space-y-1">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            {success && <p className="text-sm text-finished">{success}</p>}
          </div>
        )}
        <ul className="space-y-3">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const isEditingPassword = passwordUserId === u.id;

            return (
              <li key={u.id} className="admin-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {u.username}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-muted">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      Desde {new Date(u.createdAt).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      variant="secondary"
                      className="px-3 py-1.5 text-sm"
                      onClick={() => {
                        clearMessages();
                        setPasswordUserId(isEditingPassword ? null : u.id);
                        setNewPassword('');
                      }}
                    >
                      {isEditingPassword ? 'Cancelar' : 'Contraseña'}
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      disabled={isSelf}
                      loading={isLoading(`delete:${u.id}`)}
                      onClick={() => handleDelete(u)}
                      title={isSelf ? 'No puedes eliminar tu propia cuenta' : undefined}
                    >
                      Eliminar
                    </AdminButton>
                  </div>
                </div>

                {isEditingPassword && (
                  <form
                    className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePasswordChange(u.id);
                    }}
                  >
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="admin-input sm:flex-1"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <AdminButton
                      type="submit"
                      className="px-4 py-2 text-sm sm:shrink-0"
                      loading={isLoading(`password:${u.id}`)}
                    >
                      Guardar
                    </AdminButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <form
        onSubmit={handleCreate}
        className="admin-card h-fit space-y-4 p-5 lg:sticky lg:top-24"
      >
        <h2 className="font-display font-bold">Nuevo administrador</h2>
        <input
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="admin-input"
          required
          minLength={3}
          autoComplete="off"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="admin-input"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <AdminButton type="submit" className="w-full py-2.5" loading={isLoading('create')}>
          Crear usuario
        </AdminButton>
      </form>
    </div>
  );
}
