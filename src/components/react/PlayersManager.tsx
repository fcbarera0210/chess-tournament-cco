import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAdminTournament } from '../../hooks/useAdminTournament';
import { adminApiUrl } from '../../lib/admin-api';
import { showAdminToast } from '../../lib/admin-toast';

type Player = {
  id: string;
  name: string;
  contact: string;
  clubLevel: string | null;
  status: string;
};

export function PlayersManager() {
  const { tournamentId, tournament } = useAdminTournament();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [clubLevel, setClubLevel] = useState('');
  const [formError, setFormError] = useState('');
  const { run, isLoading } = useAsyncAction();

  const isFinished = tournament?.status === 'finished';

  async function load() {
    if (!tournamentId) return;
    const res = await fetch(adminApiUrl('/api/players', tournamentId));
    const data = await res.json();
    setPlayers(data.players ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId]);

  async function registerPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!tournamentId) return;

    setFormError('');
    await run('register', async () => {
      const res = await fetch(adminApiUrl('/api/players', tournamentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, clubLevel }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? 'Error al inscribir jugador');
        return;
      }

      setName('');
      setContact('');
      setClubLevel('');
      showAdminToast(`${data.player.name} inscrito con check-in`, 'success');
      await load();
    });
  }

  async function updateStatus(playerId: string, status: string) {
    if (!tournamentId) return;
    await run(`status:${playerId}:${status}`, async () => {
      await fetch(adminApiUrl('/api/players', tournamentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, status }),
      });
      await load();
    });
  }

  async function promote(playerId: string) {
    if (!tournamentId) return;
    await run(`promote:${playerId}`, async () => {
      await fetch(adminApiUrl('/api/players', tournamentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, promoteFromWaitlist: true }),
      });
      await load();
    });
  }

  const filtered = players.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const checkedInCount = players.filter((p) => p.status === 'checked_in').length;

  const statusLabel: Record<string, string> = {
    registered: 'Inscrito',
    waitlist: 'Lista espera',
    checked_in: 'Check-in ✓',
    withdrawn: 'Retirado',
  };

  if (loading) return <p className="text-muted">Cargando jugadores...</p>;

  return (
    <div className="space-y-6">
      {!isFinished && (
        <div className="admin-card p-5">
          <h2 className="font-display text-lg font-bold">Inscribir jugador</h2>
          <p className="mt-1 text-sm text-muted">
            Los jugadores añadidos desde aquí quedan con check-in listo para los pareos.
          </p>

          {formError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </p>
          )}

          <form onSubmit={registerPlayer} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Nombre</span>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="admin-input mt-1 w-full"
                placeholder="Nombre del jugador"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Contacto</span>
              <span className="ml-1 text-xs text-muted">(opcional)</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="admin-input mt-1 w-full"
                placeholder="Email o teléfono"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Club / nivel</span>
              <span className="ml-1 text-xs text-muted">(opcional)</span>
              <input
                type="text"
                value={clubLevel}
                onChange={(e) => setClubLevel(e.target.value)}
                className="admin-input mt-1 w-full"
                placeholder="Ej. principiante, club local"
              />
            </label>
            <div className="sm:col-span-2">
              <AdminButton type="submit" loading={isLoading('register')}>
                Inscribir con check-in
              </AdminButton>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{checkedInCount}</span> con check-in ·{' '}
          <span className="font-semibold text-ink">{players.length}</span> en total
        </p>
      </div>

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
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted">
            {players.length === 0
              ? 'Aún no hay jugadores. Usa el formulario de arriba para inscribir.'
              : 'Ningún jugador coincide con el filtro.'}
          </p>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="admin-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.name}</p>
                {p.contact !== '—' && <p className="text-sm text-muted">{p.contact}</p>}
                {p.clubLevel && <p className="text-xs text-muted">{p.clubLevel}</p>}
              </div>
              <span className="admin-chip admin-chip-inactive text-xs">
                {statusLabel[p.status] ?? p.status}
              </span>
            </div>
            {!isFinished && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.status !== 'checked_in' && p.status !== 'withdrawn' && (
                  <AdminButton
                    className="px-3 py-2 text-sm"
                    loading={isLoading(`status:${p.id}:checked_in`)}
                    onClick={() => updateStatus(p.id, 'checked_in')}
                  >
                    Check-in
                  </AdminButton>
                )}
                {p.status === 'checked_in' && (
                  <AdminButton
                    variant="secondary"
                    className="px-3 py-2 text-sm"
                    loading={isLoading(`status:${p.id}:registered`)}
                    onClick={() => updateStatus(p.id, 'registered')}
                  >
                    Quitar check-in
                  </AdminButton>
                )}
                {p.status === 'waitlist' && (
                  <AdminButton
                    variant="secondary"
                    className="px-3 py-2 text-sm"
                    loading={isLoading(`promote:${p.id}`)}
                    onClick={() => promote(p.id)}
                  >
                    Promover a inscrito
                  </AdminButton>
                )}
                {p.status !== 'withdrawn' && (
                  <AdminButton
                    variant="ghost"
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    loading={isLoading(`status:${p.id}:withdrawn`)}
                    onClick={() => updateStatus(p.id, 'withdrawn')}
                  >
                    Retirar
                  </AdminButton>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
