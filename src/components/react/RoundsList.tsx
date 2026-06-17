import { useEffect, useState } from 'react';

type Round = {
  id: string;
  roundNumber: number;
  status: string;
};

export function RoundsList() {
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    fetch('/api/rounds')
      .then((r) => r.json())
      .then((d) => setRounds(d.rounds ?? []));
  }, []);

  async function createRound() {
    const res = await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_round' }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = `/admin/rondas/${data.round.roundNumber}`;
    }
  }

  const statusLabel: Record<string, string> = {
    draft: 'Borrador',
    active: 'En juego',
    completed: 'Completada',
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={createRound}
        className="rounded-xl bg-teal px-4 py-3 font-semibold text-white"
      >
        + Nueva ronda
      </button>
      <div className="space-y-2">
        {rounds.map((r) => (
          <a
            key={r.id}
            href={`/admin/rondas/${r.roundNumber}`}
            className="flex items-center justify-between rounded-xl border border-sand bg-white p-4 hover:bg-cream"
          >
            <span className="font-semibold">Ronda {r.roundNumber}</span>
            <span className="rounded-full bg-sand px-3 py-1 text-sm">{statusLabel[r.status]}</span>
          </a>
        ))}
        {rounds.length === 0 && (
          <p className="text-ink/60">No hay rondas. Inicia el torneo desde Configuración.</p>
        )}
      </div>
    </div>
  );
}
