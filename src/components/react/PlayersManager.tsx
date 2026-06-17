import { useEffect, useState } from 'react';

type Player = {
  id: string;
  name: string;
  contact: string;
  clubLevel: string | null;
  status: string;
};

export function PlayersManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/players');
    const data = await res.json();
    setPlayers(data.players ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(playerId: string, status: string) {
    await fetch('/api/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, status }),
    });
    load();
  }

  async function promote(playerId: string) {
    await fetch('/api/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, promoteFromWaitlist: true }),
    });
    load();
  }

  const filtered = players.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusLabel: Record<string, string> = {
    registered: 'Inscrito',
    waitlist: 'Lista espera',
    checked_in: 'Check-in ✓',
    withdrawn: 'Retirado',
  };

  if (loading) return <p className="text-muted">Cargando jugadores...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['all', 'registered', 'waitlist', 'checked_in'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={filter === f ? 'admin-chip admin-chip-active' : 'admin-chip admin-chip-inactive'}
          >
            {f === 'all' ? 'Todos' : statusLabel[f]}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Buscar jugador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="admin-input"
      />

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="admin-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted">{p.contact}</p>
                {p.clubLevel && <p className="text-xs text-muted">{p.clubLevel}</p>}
              </div>
              <span className="admin-chip admin-chip-inactive text-xs">
                {statusLabel[p.status] ?? p.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.status !== 'checked_in' && p.status !== 'withdrawn' && (
                <button
                  type="button"
                  onClick={() => updateStatus(p.id, 'checked_in')}
                  className="admin-btn admin-btn-primary px-3 py-2 text-sm"
                >
                  Check-in
                </button>
              )}
              {p.status === 'checked_in' && (
                <button
                  type="button"
                  onClick={() => updateStatus(p.id, 'registered')}
                  className="admin-btn admin-btn-secondary px-3 py-2 text-sm"
                >
                  Quitar check-in
                </button>
              )}
              {p.status === 'waitlist' && (
                <button
                  type="button"
                  onClick={() => promote(p.id)}
                  className="admin-btn admin-btn-secondary px-3 py-2 text-sm"
                >
                  Promover a inscrito
                </button>
              )}
              {p.status !== 'withdrawn' && (
                <button
                  type="button"
                  onClick={() => updateStatus(p.id, 'withdrawn')}
                  className="admin-btn px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Retirar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
