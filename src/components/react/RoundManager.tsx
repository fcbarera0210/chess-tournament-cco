import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

type Player = { id: string; name: string; status: string };

type Game = {
  id: string;
  boardNumber: number;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  whiteName: string | null;
  blackName: string | null;
  result: string;
  isBye: boolean;
};

type Round = { id: string; roundNumber: number; status: string };

type Pairing = {
  boardNumber: number;
  whitePlayerId: string;
  blackPlayerId: string;
  isBye: boolean;
};

type Props = { roundNumber: number };

function getAssignedPlayerIds(pairings: Pairing[], excludeIndex: number): Set<string> {
  const ids = new Set<string>();
  pairings.forEach((p, i) => {
    if (i === excludeIndex) return;
    if (p.whitePlayerId) ids.add(p.whitePlayerId);
    if (p.blackPlayerId) ids.add(p.blackPlayerId);
  });
  return ids;
}

function playersForSelect(
  all: Player[],
  assignedElsewhere: Set<string>,
  currentWhite: string,
  currentBlack: string,
  side: 'white' | 'black',
) {
  const otherSideId = side === 'white' ? currentBlack : currentWhite;
  return all.filter((pl) => {
    if (pl.id === currentWhite || pl.id === currentBlack) return true;
    if (assignedElsewhere.has(pl.id)) return false;
    if (pl.id === otherSideId) return false;
    return true;
  });
}

function gamesToPairings(games: Game[]): Pairing[] {
  return games.map((g) => ({
    boardNumber: g.boardNumber,
    whitePlayerId: g.whitePlayerId ?? (g.isBye ? g.blackPlayerId ?? '' : ''),
    blackPlayerId: g.blackPlayerId ?? '',
    isBye: g.isBye,
  }));
}

export function RoundManager({ roundNumber }: Props) {
  const [round, setRound] = useState<Round | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [isEditingPairings, setIsEditingPairings] = useState(false);
  const [pairingWarnings, setPairingWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { run, isLoading } = useAsyncAction();

  async function load() {
    const [roundRes, playersRes] = await Promise.all([
      fetch(`/api/rounds/${roundNumber}`),
      fetch('/api/players'),
    ]);

    if (roundRes.ok) {
      const roundData = await roundRes.json();
      setRound(roundData.round);
      setGames(roundData.games ?? []);
    }

    const playersData = await playersRes.json();
    setPlayers(
      (playersData.players as Player[]).filter((p) =>
        ['checked_in', 'registered'].includes(p.status),
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [roundNumber]);

  const checkedInPlayers = players.filter((p) => p.status === 'checked_in');

  function addPairing() {
    setPairings([
      ...pairings,
      { boardNumber: pairings.length + 1, whitePlayerId: '', blackPlayerId: '', isBye: false },
    ]);
  }

  function startEditing() {
    setPairings(gamesToPairings(games));
    setIsEditingPairings(true);
    setMessage('');
  }

  function cancelEditing() {
    setIsEditingPairings(false);
    setPairings([]);
    setPairingWarnings([]);
    setMessage('');
  }

  async function generatePairings() {
    if (!round) return;
    await run('generate', async () => {
      setMessage('');
      setPairingWarnings([]);
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_pairings', roundId: round.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? 'Error al generar emparejamientos');
        return;
      }

      setPairings(
        (data.pairings as Array<{
          boardNumber: number;
          whitePlayerId: string;
          blackPlayerId: string | null;
          isBye: boolean;
        }>).map((p) => ({
          boardNumber: p.boardNumber,
          whitePlayerId: p.whitePlayerId,
          blackPlayerId: p.blackPlayerId ?? '',
          isBye: p.isBye,
        })),
      );
      setPairingWarnings(data.warnings ?? []);
      setIsEditingPairings(true);

      if (data.byePlayerId) {
        const byePlayer = checkedInPlayers.find((p) => p.id === data.byePlayerId);
        if (byePlayer) {
          setPairingWarnings((prev) => [
            `Bye automático (+1 pt): ${byePlayer.name}`,
            ...prev,
          ]);
        }
      }
    });
  }

  async function savePairings() {
    if (!round) return;
    await run('save', async () => {
      const valid = pairings.filter((p) =>
        p.isBye ? p.whitePlayerId : p.whitePlayerId && p.blackPlayerId,
      );
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_pairings',
          roundId: round.id,
          pairings: valid.map((p, i) => ({
            boardNumber: i + 1,
            whitePlayerId: p.whitePlayerId || null,
            blackPlayerId: p.isBye ? null : p.blackPlayerId || null,
            isBye: p.isBye,
          })),
        }),
      });
      if (res.ok) {
        setMessage('Emparejamientos guardados');
        setIsEditingPairings(false);
        setPairings([]);
        await load();
      } else {
        const d = await res.json();
        setMessage(d.error ?? 'Error');
      }
    });
  }

  async function activateRound() {
    if (!round) return;
    await run('activate', async () => {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_round', roundId: round.id }),
      });
      if (res.ok) {
        await load();
      } else {
        const d = await res.json();
        setMessage(d.error ?? 'Error');
      }
    });
  }

  async function setResult(gameId: string, result: string) {
    await run(`result:${gameId}:${result}`, async () => {
      await fetch('/api/games', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, result }),
      });
      await load();
    });
  }

  async function completeRound() {
    if (!round) return;
    await run('complete', async () => {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_round', roundId: round.id }),
      });
      if (res.ok) {
        setMessage('Ronda completada');
        await load();
      } else {
        const d = await res.json();
        setMessage(d.error ?? 'Error');
      }
    });
  }

  if (loading) return <p className="text-muted">Cargando ronda...</p>;
  if (!round) return <p className="text-muted">Ronda no encontrada</p>;

  const showEditor =
    round.status === 'draft' && (games.length === 0 || isEditingPairings);
  const showDraftSummary =
    round.status === 'draft' && games.length > 0 && !isEditingPairings;
  const showActiveGames = round.status !== 'draft' && games.length > 0;

  const statusLabel: Record<string, string> = {
    draft: 'borrador',
    active: 'en juego',
    completed: 'completada',
  };

  return (
    <div className="space-y-6">
      <a href="/admin/rondas" className="admin-link-back">
        ← Volver a rondas
      </a>

      <h1 className="font-display text-3xl font-bold">
        Ronda {round.roundNumber}
        <span className="ml-2 text-base font-normal text-muted">
          ({statusLabel[round.status] ?? round.status})
        </span>
      </h1>

      {message && (
        <p
          className={`text-sm ${
            message.includes('Error') ||
            message.includes('Falta') ||
            message.includes('debe') ||
            message.includes('Solo') ||
            message.includes('inválid')
              ? 'text-red-600'
              : 'text-finished'
          }`}
        >
          {message}
        </p>
      )}

      {showDraftSummary && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Emparejamientos guardados. Activa la ronda para comenzar.
          </p>
          {games.map((g) => (
            <div key={g.id} className="admin-card p-3">
              <span className="font-display font-semibold">Mesa {g.boardNumber}: </span>
              {g.isBye
                ? `${g.whiteName ?? g.blackName} — bye`
                : `${g.whiteName} vs ${g.blackName}`}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" onClick={startEditing}>
              Editar mesas
            </AdminButton>
            <AdminButton
              className="flex-1 py-3 sm:flex-none"
              loading={isLoading('activate')}
              onClick={activateRound}
            >
              Activar ronda
            </AdminButton>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="admin-card space-y-4 p-5">
          <h2 className="font-display font-bold">
            {isEditingPairings ? 'Editar emparejamientos' : 'Emparejamientos'}
          </h2>
          <p className="text-sm text-muted">
            Genera automáticamente o configura las mesas manualmente. Puedes ajustar antes de
            guardar.
          </p>
          {pairingWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Avisos del pareo</p>
              <ul className="mt-1 list-inside list-disc">
                {pairingWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="secondary"
              className="text-sm"
              loading={isLoading('generate')}
              onClick={generatePairings}
            >
              Generar emparejamientos
            </AdminButton>
            {pairings.length === 0 && (
              <AdminButton variant="secondary" className="text-sm" onClick={addPairing}>
                Agregar primera mesa
              </AdminButton>
            )}
          </div>
          {pairings.map((p, idx) => {
            const assignedElsewhere = getAssignedPlayerIds(pairings, idx);
            const whiteOptions = playersForSelect(
              checkedInPlayers,
              assignedElsewhere,
              p.whitePlayerId,
              p.blackPlayerId,
              'white',
            );
            const blackOptions = playersForSelect(
              checkedInPlayers,
              assignedElsewhere,
              p.whitePlayerId,
              p.blackPlayerId,
              'black',
            );

            return (
              <div key={idx} className="grid gap-2 rounded-xl bg-bg p-3 sm:grid-cols-2">
                <select
                  value={p.whitePlayerId}
                  onChange={(e) => {
                    const next = [...pairings];
                    next[idx].whitePlayerId = e.target.value;
                    if (next[idx].blackPlayerId === e.target.value) {
                      next[idx].blackPlayerId = '';
                    }
                    setPairings(next);
                  }}
                  className="admin-input py-2"
                >
                  <option value="">Blancas...</option>
                  {whiteOptions.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
                <select
                  value={p.blackPlayerId}
                  disabled={p.isBye}
                  onChange={(e) => {
                    const next = [...pairings];
                    next[idx].blackPlayerId = e.target.value;
                    setPairings(next);
                  }}
                  className="admin-input py-2"
                >
                  <option value="">Negras...</option>
                  {blackOptions.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={p.isBye}
                    onChange={(e) => {
                      const next = [...pairings];
                      next[idx].isBye = e.target.checked;
                      if (e.target.checked) next[idx].blackPlayerId = '';
                      setPairings(next);
                    }}
                  />
                  Bye (descansa)
                </label>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" className="text-sm" onClick={addPairing}>
              + Mesa
            </AdminButton>
            <AdminButton
              className="text-sm"
              loading={isLoading('save')}
              onClick={savePairings}
            >
              Guardar
            </AdminButton>
            {isEditingPairings && (
              <AdminButton variant="secondary" className="text-sm" onClick={cancelEditing}>
                Cancelar
              </AdminButton>
            )}
          </div>
        </div>
      )}

      {showActiveGames && (
        <div className="space-y-3">
          {games.map((g) => (
            <div key={g.id} className="admin-card p-4">
              <p className="mb-2 font-display font-bold">Mesa {g.boardNumber}</p>
              <p className="text-lg font-semibold">
                {g.isBye
                  ? `${g.whiteName ?? g.blackName} — bye`
                  : `${g.whiteName} vs ${g.blackName ?? '—'}`}
              </p>
              {round.status === 'active' && g.result === 'pending' && !g.isBye && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: '1-0', result: 'white' },
                    { label: '½-½', result: 'draw' },
                    { label: '0-1', result: 'black' },
                  ].map((btn) => (
                    <AdminButton
                      key={btn.result}
                      className="min-h-[48px] py-3 text-lg"
                      loading={isLoading(`result:${g.id}:${btn.result}`)}
                      onClick={() => setResult(g.id, btn.result)}
                    >
                      {btn.label}
                    </AdminButton>
                  ))}
                </div>
              )}
              {g.result !== 'pending' && (
                <p className="mt-2 text-sm font-medium text-finished">Resultado registrado</p>
              )}
            </div>
          ))}
          {round.status === 'active' && (
            <AdminButton
              variant="secondary"
              className="w-full border-2 border-ink py-3 font-semibold"
              loading={isLoading('complete')}
              onClick={completeRound}
            >
              Cerrar ronda
            </AdminButton>
          )}
        </div>
      )}

      {round.status === 'draft' && games.length === 0 && pairings.length === 0 && !isEditingPairings && (
        <p className="text-muted">Configura los emparejamientos y guarda para continuar.</p>
      )}
    </div>
  );
}
