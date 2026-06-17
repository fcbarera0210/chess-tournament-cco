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

  if (loading) return <p>Cargando jugadores...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['all', 'registered', 'waitlist', 'checked_in'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === f ? 'bg-teal text-white' : 'bg-sand text-ink/70'}`}
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
        className="w-full rounded-xl border border-sand px-4 py-2.5"
      />

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl border border-sand bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-ink/60">{p.contact}</p>
                {p.clubLevel && <p className="text-xs text-ink/50">{p.clubLevel}</p>}
              </div>
              <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium">
                {statusLabel[p.status] ?? p.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.status !== 'checked_in' && p.status !== 'withdrawn' && (
                <button
                  type="button"
                  onClick={() => updateStatus(p.id, 'checked_in')}
                  className="rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white"
                >
                  Check-in
                </button>
              )}
              {p.status === 'checked_in' && (
                <button
                  type="button"
                  onClick={() => updateStatus(p.id, 'registered')}
                  className="rounded-lg bg-sand px-3 py-2 text-sm"
                >
                  Quitar check-in
                </button>
              )}
              {p.status === 'waitlist' && (
                <button
                  type="button"
                  onClick={() => promote(p.id)}
                  className="rounded-lg bg-gold/20 px-3 py-2 text-sm font-medium"
                >
                  Promover a inscrito
                </button>
              )}
              {p.status !== 'withdrawn' && (
                <button
                  type="button"
                  onClick={() => updateStatus(p.id, 'withdrawn')}
                  className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
