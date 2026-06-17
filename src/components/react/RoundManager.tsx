import { useEffect, useState } from 'react';

type Player = { id: string; name: string; status: string };

type Game = {
  id: string;
  boardNumber: number;
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

export function RoundManager({ roundNumber }: Props) {
  const [round, setRound] = useState<Round | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

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

  async function savePairings() {
    if (!round) return;
    const valid = pairings.filter((p) => (p.isBye ? p.whitePlayerId : p.whitePlayerId && p.blackPlayerId));
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
      load();
    } else {
      const d = await res.json();
      setMessage(d.error ?? 'Error');
    }
  }

  async function activateRound() {
    if (!round) return;
    const res = await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate_round', roundId: round.id }),
    });
    if (res.ok) load();
    else {
      const d = await res.json();
      setMessage(d.error ?? 'Error');
    }
  }

  async function setResult(gameId: string, result: string) {
    await fetch('/api/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, result }),
    });
    load();
  }

  async function completeRound() {
    if (!round) return;
    const res = await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_round', roundId: round.id }),
    });
    if (res.ok) {
      setMessage('Ronda completada');
      load();
    } else {
      const d = await res.json();
      setMessage(d.error ?? 'Error');
    }
  }

  if (loading) return <p>Cargando ronda...</p>;
  if (!round) return <p>Ronda no encontrada</p>;

  const showPairingEditor = round.status === 'draft' && games.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">
        Ronda {round.roundNumber}
        <span className="ml-2 text-base font-normal text-ink/60">({round.status})</span>
      </h1>

      {message && <p className="text-sm text-teal">{message}</p>}

      {round.status === 'draft' && games.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">Emparejamientos guardados. Activa la ronda para comenzar.</p>
          {games.map((g) => (
            <div key={g.id} className="rounded-xl border border-sand bg-white p-3">
              <span className="font-semibold text-teal">Mesa {g.boardNumber}: </span>
              {g.isBye
                ? `${g.whiteName ?? g.blackName} — bye`
                : `${g.whiteName} vs ${g.blackName}`}
            </div>
          ))}
          <button
            type="button"
            onClick={activateRound}
            className="w-full rounded-xl bg-teal py-3 font-semibold text-white"
          >
            Activar ronda
          </button>
        </div>
      )}

      {showPairingEditor && (
        <div className="space-y-4 rounded-2xl border border-sand bg-white p-4">
          <h2 className="font-semibold">Emparejamientos</h2>
          {pairings.length === 0 && (
            <button type="button" onClick={addPairing} className="rounded-lg bg-sand px-4 py-2 text-sm">
              Agregar primera mesa
            </button>
          )}
          {pairings.map((p, idx) => (
            <div key={idx} className="grid gap-2 rounded-xl bg-cream p-3 sm:grid-cols-2">
              <select
                value={p.whitePlayerId}
                onChange={(e) => {
                  const next = [...pairings];
                  next[idx].whitePlayerId = e.target.value;
                  setPairings(next);
                }}
                className="rounded-lg border border-sand px-3 py-2"
              >
                <option value="">Blancas...</option>
                {checkedInPlayers.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
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
                className="rounded-lg border border-sand px-3 py-2"
              >
                <option value="">Negras...</option>
                {checkedInPlayers.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
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
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addPairing} className="rounded-lg bg-sand px-4 py-2 text-sm">
              + Mesa
            </button>
            <button type="button" onClick={savePairings} className="rounded-lg bg-teal px-4 py-2 text-sm text-white">
              Guardar
            </button>
            <button type="button" onClick={activateRound} className="rounded-lg bg-teal-light px-4 py-2 text-sm text-white">
              Activar ronda
            </button>
          </div>
        </div>
      )}

      {games.length > 0 && (
        <div className="space-y-3">
          {games.map((g) => (
            <div key={g.id} className="rounded-2xl border border-sand bg-white p-4">
              <p className="mb-2 font-display font-bold text-teal">Mesa {g.boardNumber}</p>
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
                    <button
                      key={btn.result}
                      type="button"
                      onClick={() => setResult(g.id, btn.result)}
                      className="min-h-[48px] rounded-xl bg-teal py-3 text-lg font-bold text-white active:bg-teal-light"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
              {g.result !== 'pending' && (
                <p className="mt-2 text-sm font-medium text-finished">Resultado registrado</p>
              )}
            </div>
          ))}
          {round.status === 'active' && (
            <button
              type="button"
              onClick={completeRound}
              className="w-full rounded-xl border-2 border-teal py-3 font-semibold text-teal"
            >
              Cerrar ronda
            </button>
          )}
        </div>
      )}

      {round.status === 'draft' && games.length === 0 && pairings.length === 0 && (
        <p className="text-ink/60">Configura los emparejamientos y activa la ronda.</p>
      )}
    </div>
  );
}
