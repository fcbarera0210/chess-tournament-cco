import { useEffect, useState } from 'react';

type AdminUser = { id: string; username: string; createdAt: string };

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
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
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display mb-3 font-bold">Administradores</h2>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="rounded-xl border border-sand bg-white px-4 py-3">
              <span className="font-semibold">{u.username}</span>
              <span className="ml-2 text-xs text-ink/50">
                {new Date(u.createdAt).toLocaleDateString('es-CL')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-sand bg-white p-4 space-y-3">
        <h2 className="font-display font-bold">Nuevo admin</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-finished">{success}</p>}
        <input
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border border-sand px-4 py-2"
          required
          minLength={3}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-sand px-4 py-2"
          required
          minLength={6}
        />
        <button type="submit" className="w-full rounded-xl bg-teal py-2.5 font-semibold text-white">
          Crear usuario
        </button>
      </form>
    </div>
  );
}
