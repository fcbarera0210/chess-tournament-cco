import { useEffect, useState } from 'react';
import { publicApiUrl } from '../../lib/admin-api';

type Standing = {
  playerId: string;
  name: string;
  teamName?: string | null;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  buchholzCut1: number;
};

type TeamStanding = {
  teamId: string;
  name: string;
  points: number;
  buchholzCut1: number;
  playerCount: number;
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
};

type StandingsData = {
  error?: string;
  tournament?: { name: string; status: string; isTeamTournament?: boolean };
  standings?: Standing[];
  teamStandings?: TeamStanding[];
  players?: { id: string; name: string; status: string; teamName?: string | null }[];
};

type Props = {
  slug: string;
};

export function StandingsTable({ slug }: Props) {
  const [data, setData] = useState<StandingsData | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(publicApiUrl('/api/standings', slug))
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData({ error: 'Error de conexión' }));

    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [slug]);

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
  const teamStandings = data.teamStandings ?? [];
  const players = data.players ?? [];
  const isTeamTournament = Boolean(data.tournament.isTeamTournament);
  const isLive = data.tournament.status === 'live';
  const isFinished = data.tournament.status === 'finished';
  const hasStandings = standings.some((s) => s.points > 0 || s.gamesPlayed > 0);

  if (!isLive && !hasStandings && !isFinished) {
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
              {isTeamTournament && p.teamName ? (
                <span className="ml-2 font-normal text-muted">· {p.teamName}</span>
              ) : null}
            </li>
          ))}
        </ul>
        {registered.length === 0 && (
          <p className="text-center text-white/50">
            Aún no hay inscripciones.{' '}
            <a href={`/inscripcion/${slug}`} className="text-white underline">
              ¡Sé el primero!
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isTeamTournament && teamStandings.length > 0 && (
        <div className="overflow-x-auto rounded-3xl bg-surface shadow-lg">
          <div className="border-b border-border bg-bg px-5 py-4">
            <h2 className="font-display text-lg font-bold">Clasificación por equipos</h2>
            <p className="text-sm text-muted">Suma de puntos de los jugadores (estilo Olympiad)</p>
          </div>
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-border bg-bg/60">
              <tr>
                <th className="px-5 py-3 font-display font-bold">#</th>
                <th className="px-5 py-3 font-display font-bold">Equipo</th>
                <th className="px-5 py-3 text-center font-display font-bold">Pts</th>
                <th
                  className="hidden px-5 py-3 text-center font-semibold md:table-cell"
                  title="Suma Buchholz Cut 1 de los jugadores"
                >
                  BH
                </th>
                <th className="hidden px-5 py-3 text-center font-semibold sm:table-cell">Jug.</th>
              </tr>
            </thead>
            <tbody>
              {teamStandings.map((s, i) => (
                <tr
                  key={s.teamId}
                  className={`border-b border-border/50 last:border-0 ${i < 3 ? 'bg-bg/50' : ''}`}
                >
                  <td className="px-5 py-4 font-display font-bold text-muted">{i + 1}</td>
                  <td className="px-5 py-4 font-semibold">{s.name}</td>
                  <td className="px-5 py-4 text-center font-display text-lg font-bold">{s.points}</td>
                  <td className="hidden px-5 py-4 text-center md:table-cell">{s.buchholzCut1}</td>
                  <td className="hidden px-5 py-4 text-center sm:table-cell">{s.playerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl bg-surface shadow-lg">
        {isTeamTournament && (
          <div className="border-b border-border bg-bg px-5 py-4">
            <h2 className="font-display text-lg font-bold">Clasificación individual</h2>
          </div>
        )}
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-border bg-bg">
            <tr>
              <th className="px-5 py-4 font-display font-bold">#</th>
              <th className="px-5 py-4 font-display font-bold">Jugador</th>
              {isTeamTournament && (
                <th className="hidden px-5 py-4 font-semibold sm:table-cell">Equipo</th>
              )}
              <th className="px-5 py-4 text-center font-display font-bold">Pts</th>
              <th
                className="hidden px-5 py-4 text-center font-semibold md:table-cell"
                title="Buchholz Cut 1 (desempate)"
              >
                BH
              </th>
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
                <td className="px-5 py-4 font-semibold">
                  {s.name}
                  {isTeamTournament && s.teamName ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted sm:hidden">
                      {s.teamName}
                    </span>
                  ) : null}
                </td>
                {isTeamTournament && (
                  <td className="hidden px-5 py-4 text-muted sm:table-cell">{s.teamName ?? '—'}</td>
                )}
                <td className="px-5 py-4 text-center font-display text-lg font-bold">{s.points}</td>
                <td className="hidden px-5 py-4 text-center md:table-cell">{s.buchholzCut1}</td>
                <td className="hidden px-5 py-4 text-center sm:table-cell">{s.gamesPlayed}</td>
                <td className="hidden px-5 py-4 text-center md:table-cell">{s.wins}</td>
                <td className="hidden px-5 py-4 text-center md:table-cell">{s.draws}</td>
                <td className="hidden px-5 py-4 text-center md:table-cell">{s.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
