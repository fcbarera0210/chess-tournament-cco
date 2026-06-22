import { useEffect, useState } from 'react';
import { TournamentGallery } from './TournamentGallery';
import { publicApiUrl } from '../../lib/admin-api';

type Standing = {
  playerId: string;
  name: string;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  buchholzCut1: number;
};

type Participant = {
  id: string;
  name: string;
  clubLevel: string | null;
  status: string;
};

type RoundGame = {
  boardNumber: number;
  whiteName: string | null;
  blackName: string | null;
  resultLabel: string;
  isBye: boolean;
};

type Round = {
  roundNumber: number;
  status: string;
  games: RoundGame[];
};

type ArchiveData = {
  error?: string;
  tournament?: {
    name: string;
    eventDate: string;
    eventTimeStart: string;
    eventTimeEnd: string;
    venue: string;
    venueMapsUrl: string | null;
    format: string;
    timeControl: string;
    status: string;
  };
  standings?: Standing[];
  participants?: Participant[];
  rounds?: Round[];
};

function formatEventDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function TournamentArchive({ slug }: { slug: string }) {
  const [data, setData] = useState<ArchiveData | null>(null);
  const [openRound, setOpenRound] = useState<number | null>(null);

  useEffect(() => {
    fetch(publicApiUrl('/api/tournament/archive', slug))
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: 'Error de conexión' }));
  }, [slug]);

  if (!data) {
    return <p className="text-center text-muted">Cargando archivo del torneo...</p>;
  }

  if (data.error || !data.tournament) {
    return (
      <div className="card-light p-8 text-center text-muted">
        No se pudo cargar el archivo del torneo.
      </div>
    );
  }

  const { tournament, standings = [], participants = [], rounds = [] } = data;
  const eventDate = formatEventDate(tournament.eventDate);

  return (
    <div className="space-y-12">
      <section className="section-dark rounded-3xl px-6 py-12 text-center">
        <span className="inline-flex rounded-full border border-finished/30 bg-finished/10 px-4 py-1 text-sm font-semibold text-finished">
          Torneo finalizado
        </span>
        <h1 className="font-display mt-4 text-4xl font-bold md:text-5xl">{tournament.name}</h1>
        <p className="mx-auto mt-3 max-w-xl capitalize text-white/70">{eventDate}</p>
        <p className="mt-1 text-white/60">
          {tournament.eventTimeStart} – {tournament.eventTimeEnd} · {tournament.venue}
        </p>
        {tournament.venueMapsUrl && (
          <a
            href={tournament.venueMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-white underline-offset-2 hover:underline"
          >
            Ver ubicación
          </a>
        )}
        <p className="mt-4 text-sm text-white/50">
          Formato {tournament.format === 'swiss' ? 'suizo' : 'eliminatoria'} · control{' '}
          {tournament.timeControl}
        </p>
      </section>

      <section>
        <h2 className="font-display mb-6 text-2xl font-bold md:text-3xl">Clasificación final</h2>
        <div className="overflow-x-auto rounded-3xl bg-surface shadow-lg">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border bg-bg">
              <tr>
                <th className="px-5 py-4 font-display font-bold">#</th>
                <th className="px-5 py-4 font-display font-bold">Jugador</th>
                <th className="px-5 py-4 text-center font-display font-bold">Pts</th>
                <th
                  className="hidden px-5 py-4 text-center font-semibold md:table-cell"
                  title="Buchholz Cut 1"
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
                  <td className="px-5 py-4 font-semibold">{s.name}</td>
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
      </section>

      <section>
        <h2 className="font-display mb-6 text-2xl font-bold md:text-3xl">Participantes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((p) => (
            <div key={p.id} className="card-light p-4 shadow-sm">
              <p className="font-semibold">{p.name}</p>
              {p.clubLevel && <p className="mt-1 text-sm text-muted">{p.clubLevel}</p>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display mb-6 text-2xl font-bold md:text-3xl">Rondas y partidas</h2>
        <div className="space-y-3">
          {rounds.map((round) => {
            const isOpen = openRound === round.roundNumber;
            return (
              <div key={round.roundNumber} className="card-light overflow-hidden shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-display font-bold"
                  onClick={() => setOpenRound(isOpen ? null : round.roundNumber)}
                  aria-expanded={isOpen}
                >
                  <span>Ronda {round.roundNumber}</span>
                  <span className="text-sm font-normal text-muted">
                    {round.games.length} partida{round.games.length === 1 ? '' : 's'}
                  </span>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full min-w-[400px] text-left text-sm">
                      <thead className="bg-bg text-muted">
                        <tr>
                          <th className="px-5 py-3 font-medium">Mesa</th>
                          <th className="px-5 py-3 font-medium">Blancas</th>
                          <th className="px-5 py-3 font-medium">Negras</th>
                          <th className="px-5 py-3 font-medium">Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {round.games.map((g) => (
                          <tr key={g.boardNumber} className="border-t border-border/50">
                            <td className="px-5 py-3">{g.boardNumber}</td>
                            <td className="px-5 py-3">{g.whiteName ?? '—'}</td>
                            <td className="px-5 py-3">{g.blackName ?? (g.isBye ? 'bye' : '—')}</td>
                            <td className="px-5 py-3 font-medium">{g.resultLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display mb-6 text-2xl font-bold md:text-3xl">Galería</h2>
        <TournamentGallery slug={slug} />
      </section>
    </div>
  );
}
