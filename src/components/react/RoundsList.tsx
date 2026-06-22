import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAdminTournament } from '../../hooks/useAdminTournament';
import { adminApiUrl } from '../../lib/admin-api';

type Round = {
  id: string;
  roundNumber: number;
  status: string;
};

export function RoundsList() {
  const { tournamentId } = useAdminTournament();
  const [rounds, setRounds] = useState<Round[]>([]);
  const { run, isLoading } = useAsyncAction();

  useEffect(() => {
    if (!tournamentId) return;
    fetch(adminApiUrl('/api/rounds', tournamentId))
      .then((r) => r.json())
      .then((d) => setRounds(d.rounds ?? []));
  }, [tournamentId]);

  async function createRound() {
    if (!tournamentId) return;
    await run('create', async () => {
      const res = await fetch(adminApiUrl('/api/rounds', tournamentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_round' }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/admin/rondas/${data.round.roundNumber}`;
      }
    });
  }

  const statusLabel: Record<string, string> = {
    draft: 'Borrador',
    active: 'En juego',
    completed: 'Completada',
  };

  const statusClass: Record<string, string> = {
    draft: 'bg-bg text-muted ring-1 ring-border',
    active: 'bg-pending/10 text-pending',
    completed: 'bg-finished/10 text-finished',
  };

  return (
    <div className="space-y-4">
      <AdminButton className="px-5 py-3" loading={isLoading('create')} onClick={createRound}>
        + Nueva ronda
      </AdminButton>
      <div className="space-y-2">
        {rounds.map((r) => (
          <a
            key={r.id}
            href={`/admin/rondas/${r.roundNumber}`}
            className="admin-card flex items-center justify-between p-4 transition hover:bg-bg"
          >
            <span className="font-display font-semibold">Ronda {r.roundNumber}</span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass[r.status] ?? statusClass.draft}`}
            >
              {statusLabel[r.status] ?? r.status}
            </span>
          </a>
        ))}
        {rounds.length === 0 && (
          <p className="text-muted">No hay rondas. Inicia el torneo desde Configuración.</p>
        )}
      </div>
    </div>
  );
}
