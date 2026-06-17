import { useEffect, useState } from 'react';

type Standing = {
  playerId: string;
  name: string;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
};

type StandingsData = {
  error?: string;
  tournament?: { name: string; status: string };
  standings?: Standing[];
  players?: { id: string; name: string; status: string }[];
};

export function StandingsTable() {
  const [data, setData] = useState<StandingsData | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/standings')
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData({ error: 'Error de conexión' }));

    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return <p className="text-center text-muted">Cargando clasificación...</p>;
  }

  if (data.error || !data.tournament) {
    return (
      <div className="card-light p-8 text-center text-muted">
        No se pudo cargar la clasificación. Verifica que el torneo esté configurado.
      </div>
    );
  }

  const standings = data.standings ?? [];
  const players = data.players ?? [];
  const isLive = data.tournament.status === 'live';
  const hasStandings = standings.some((s) => s.points > 0 || s.gamesPlayed > 0);

  if (!isLive && !hasStandings) {
    const registered = players.filter((p) => ['registered', 'checked_in'].includes(p.status));
    return (
      <div className="section-dark rounded-3xl p-8">
        <p className="mb-6 text-center text-white/70">
          El torneo aún no ha comenzado. Jugadores inscritos:
        </p>
        <ul className="flex flex-wrap justify-center gap-3">
          {registered.map((p) => (
            <li
              key={p.id}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm"
            >
              {p.name}
            </li>
          ))}
        </ul>
        {registered.length === 0 && (
          <p className="text-center text-white/50">
            Aún no hay inscripciones.{' '}
            <a href="/inscripcion" className="text-white underline">
              ¡Sé el primero!
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-surface shadow-lg">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="border-b border-border bg-bg">
          <tr>
            <th className="px-5 py-4 font-display font-bold">#</th>
            <th className="px-5 py-4 font-display font-bold">Jugador</th>
            <th className="px-5 py-4 text-center font-display font-bold">Pts</th>
            <th className="hidden px-5 py-4 text-center font-semibold sm:table-cell">PJ</th>
            <th className="hidden px-5 py-4 text-center font-semibold md:table-cell">G</th>
            <th className="hidden px-5 py-4 text-center font-semibold md:table-cell">E</th>
            <th className="hidden px-5 py-4 text-center font-semibold md:table-cell">P</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.playerId}
              className={`border-b border-border/50 last:border-0 ${i < 3 ? 'bg-bg/50' : ''}`}
            >
              <td className="px-5 py-4 font-display font-bold text-muted">{i + 1}</td>
              <td className="px-5 py-4 font-semibold">{s.name}</td>
              <td className="px-5 py-4 text-center font-display text-lg font-bold">{s.points}</td>
              <td className="hidden px-5 py-4 text-center sm:table-cell">{s.gamesPlayed}</td>
              <td className="hidden px-5 py-4 text-center md:table-cell">{s.wins}</td>
              <td className="hidden px-5 py-4 text-center md:table-cell">{s.draws}</td>
              <td className="hidden px-5 py-4 text-center md:table-cell">{s.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
