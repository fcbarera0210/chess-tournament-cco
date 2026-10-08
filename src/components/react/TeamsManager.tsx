import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAdminTournament } from '../../hooks/useAdminTournament';
import { adminApiUrl } from '../../lib/admin-api';
import { showAdminToast } from '../../lib/admin-toast';
import { MIN_TEAMS_FOR_TEAM_TOURNAMENT } from '../../lib/team-constants';

type Team = {
  id: string;
  name: string;
  memberCount: number;
};

export function TeamsManager() {
  const { tournamentId, tournament } = useAdminTournament();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamTournament, setIsTeamTournament] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [formError, setFormError] = useState('');
  const { run, isLoading } = useAsyncAction();

  const isFinished = tournament?.status === 'finished';

  async function load() {
    if (!tournamentId) return;
    const res = await fetch(adminApiUrl('/api/teams', tournamentId));
    const data = await res.json();
    setTeams(data.teams ?? []);
    setIsTeamTournament(Boolean(data.isTeamTournament));
    setLoading(false);
  }

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId]);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!tournamentId) return;
    setFormError('');

    await run('create', async () => {
      const res = await fetch(adminApiUrl('/api/teams', tournamentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Error al crear equipo');
        return;
      }
      setName('');
      showAdminToast(`Equipo ${data.team.name} creado`, 'success');
      await load();
    });
  }

  async function saveTeamName(teamId: string) {
    if (!tournamentId) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) {
      showAdminToast('El nombre debe tener al menos 2 caracteres', 'error');
      return;
    }

    await run(`edit:${teamId}`, async () => {
      const res = await fetch(adminApiUrl('/api/teams', tournamentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAdminToast(data.error ?? 'Error al guardar', 'error');
        return;
      }
      setEditingId(null);
      setEditName('');
      showAdminToast('Equipo actualizado', 'success');
      await load();
    });
  }

  async function deleteTeam(teamId: string, teamName: string) {
    if (!tournamentId) return;
    if (!confirm(`¿Eliminar el equipo "${teamName}"? Los jugadores quedarán sin equipo.`)) return;

    await run(`delete:${teamId}`, async () => {
      const res = await fetch(adminApiUrl('/api/teams', tournamentId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAdminToast(data.error ?? 'Error al eliminar', 'error');
        return;
      }
      showAdminToast('Equipo eliminado', 'success');
      await load();
    });
  }

  if (loading) return <p className="text-muted">Cargando equipos...</p>;

  if (!isTeamTournament) {
    return (
      <div className="admin-card p-6">
        <h2 className="font-display text-lg font-bold">Torneo individual</h2>
        <p className="mt-2 text-sm text-muted">
          Activa “Torneo por equipos” en{' '}
          <a href="/admin/torneo" className="font-medium underline">
            Configuración
          </a>{' '}
          para crear y gestionar equipos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-5">
        <h2 className="font-display text-lg font-bold">Equipos</h2>
        <p className="mt-1 text-sm text-muted">
          Crea al menos {MIN_TEAMS_FOR_TEAM_TOURNAMENT} equipos antes de abrir inscripciones o pasar a
          en juego. Tamaño libre por equipo.
        </p>
        {teams.length < MIN_TEAMS_FOR_TEAM_TOURNAMENT && (
          <p className="mt-3 rounded-lg border border-pending/30 bg-pending/10 px-4 py-3 text-sm text-pending">
            Faltan equipos: tienes {teams.length} de {MIN_TEAMS_FOR_TEAM_TOURNAMENT} mínimos.
          </p>
        )}

        {!isFinished && (
          <form onSubmit={createTeam} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input w-full"
              placeholder="Nombre del equipo"
            />
            <AdminButton type="submit" loading={isLoading('create')}>
              Agregar equipo
            </AdminButton>
          </form>
        )}
        {formError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {teams.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-muted">
            Aún no hay equipos.
          </p>
        )}
        {teams.map((team) => {
          const editing = editingId === team.id;
          return (
            <div key={team.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <form
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveTeamName(team.id);
                      }}
                    >
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="admin-input w-full sm:max-w-xs"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <AdminButton
                          type="submit"
                          className="px-3 py-2 text-sm"
                          loading={isLoading(`edit:${team.id}`)}
                        >
                          Guardar
                        </AdminButton>
                        <AdminButton
                          type="button"
                          variant="secondary"
                          className="px-3 py-2 text-sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditName('');
                          }}
                        >
                          Cancelar
                        </AdminButton>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-sm text-muted">
                        {team.memberCount} jugador{team.memberCount === 1 ? '' : 'es'}
                      </p>
                    </>
                  )}
                </div>
                {!editing && !isFinished && (
                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      variant="secondary"
                      className="px-3 py-2 text-sm"
                      onClick={() => {
                        setEditingId(team.id);
                        setEditName(team.name);
                      }}
                    >
                      Renombrar
                    </AdminButton>
                    <AdminButton
                      variant="ghost"
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      loading={isLoading(`delete:${team.id}`)}
                      onClick={() => deleteTeam(team.id, team.name)}
                    >
                      Eliminar
                    </AdminButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
