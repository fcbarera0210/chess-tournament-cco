import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAdminTournament } from '../../hooks/useAdminTournament';
import { adminApiUrl } from '../../lib/admin-api';
import { showAdminToast } from '../../lib/admin-toast';

type Round = {
  id: string;
  roundNumber: number;
  status: string;
};

export function RoundsList() {
  const { tournamentId, tournament } = useAdminTournament();
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.href = `/admin/rondas/${data.round.roundNumber}`;
        return;
      }
      showAdminToast(data.error ?? 'No se pudo crear la ronda', 'error');
    });
  }

  const isFinished = tournament?.status === 'finished';
  const lastRound = rounds.reduce<Round | null>(
    (latest, r) => (!latest || r.roundNumber > latest.roundNumber ? r : latest),
    null,
  );
  const blockedByOpenRound = lastRound !== null && lastRound.status !== 'completed';

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
      {!isFinished && (
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton
            className="px-5 py-3"
            loading={isLoading('create')}
            disabled={blockedByOpenRound}
            onClick={createRound}
          >
            + Nueva ronda
          </AdminButton>
          {blockedByOpenRound && lastRound && (
            <p className="text-sm text-muted">
              Cierra la{' '}
              <a href={`/admin/rondas/${lastRound.roundNumber}`} className="font-medium text-ink underline">
                ronda {lastRound.roundNumber}
              </a>{' '}
              para crear la siguiente.
            </p>
          )}
        </div>
      )}
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
          <p className="text-muted">
            Aún no hay rondas. Haz check-in de los jugadores en{' '}
            <a href="/admin/jugadores" className="font-medium text-ink underline">
              Jugadores
            </a>{' '}
            y crea la primera ronda: el torneo pasará a “En juego”.
          </p>
        )}
      </div>
    </div>
  );
}
