import { useEffect, useState } from 'react';

type Game = {
  id: string;
  boardNumber: number;
  whiteName: string | null;
  blackName: string | null;
  result: string;
  isBye: boolean;
};

type LiveData = {
  tournament: { name: string; status: string; plannedRounds: number };
  round: {
    roundNumber: number;
    status: string;
    totalGames: number;
    finishedGames: number;
    pendingGames: number;
  } | null;
  games: Game[];
  standingsTop: { name: string; points: number }[];
  recentResults: string[];
};

function resultLabel(result: string): string {
  switch (result) {
    case 'white':
      return '1-0';
    case 'black':
      return '0-1';
    case 'draw':
      return '½-½';
    case 'bye':
      return 'BYE';
    default:
      return '·';
  }
}

function GameCard({ game, large, dark }: { game: Game; large?: boolean; dark?: boolean }) {
  const finished = game.result !== 'pending';
  return (
    <div
      className={`rounded-2xl p-4 ${dark ? 'bg-surface text-ink' : 'bg-white text-ink'} ${large ? 'p-6' : ''} ${finished ? 'ring-2 ring-finished/30' : 'ring-2 ring-pending/40'}`}
    >
      <div className={`mb-3 flex items-center justify-between ${large ? 'text-lg' : 'text-sm'}`}>
        <span className="font-display font-bold">Mesa {game.boardNumber}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${finished ? 'bg-finished/10 text-finished' : 'bg-pending/10 text-pending'}`}
        >
          {finished ? 'Finalizada' : 'En juego'}
        </span>
      </div>
      {game.isBye ? (
        <p className={`font-semibold ${large ? 'text-2xl' : 'text-lg'}`}>
          {game.whiteName ?? game.blackName} — descansa
        </p>
      ) : (
        <div className={large ? 'space-y-2 text-2xl' : 'space-y-1 text-lg'}>
          <p className="font-semibold">{game.whiteName ?? '—'}</p>
          <p className={`text-center font-display font-bold ${large ? 'text-xl' : 'text-base'}`}>
            {resultLabel(game.result)}
          </p>
          <p className="font-semibold">{game.blackName ?? '—'}</p>
        </div>
      )}
    </div>
  );
}

type Props = {
  mode: 'kiosk' | 'live';
  cols?: number;
};

export function LiveView({ mode, cols = 3 }: Props) {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/live')
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return <p className="text-center text-white/60">Cargando estado del torneo...</p>;
  }

  const gridCols =
    cols === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : cols === 4
        ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const progressPct =
    data.round && data.round.totalGames > 0
      ? Math.round((data.round.finishedGames / data.round.totalGames) * 100)
      : 0;

  if (mode === 'kiosk') {
    return (
      <div className="min-h-screen space-y-8 bg-dark px-4 py-8 text-white">
        <header className="text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">{data.tournament.name}</h1>
          {data.round ? (
            <>
              <p className="mt-2 text-xl text-white/70">
                Ronda {data.round.roundNumber} · {data.round.finishedGames}/{data.round.totalGames}{' '}
                partidas finalizadas
              </p>
              <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-xl text-white/70">Torneo por comenzar</p>
          )}
        </header>

        {data.games.length > 0 ? (
          <div className={`grid gap-4 ${gridCols}`}>
            {data.games.map((g) => (
              <GameCard key={g.id} game={g} large dark />
            ))}
          </div>
        ) : (
          <p className="text-center text-2xl text-white/50">Sin ronda activa</p>
        )}

        {data.standingsTop.length > 0 && (
          <div className="rounded-3xl bg-surface p-6 text-ink">
            <h2 className="font-display mb-4 text-2xl font-bold">Top 5</h2>
            <ol className="space-y-2 text-xl">
              {data.standingsTop.map((s, i) => (
                <li key={s.name} className="flex justify-between">
                  <span>
                    {i + 1}. {s.name}
                  </span>
                  <span className="font-display font-bold">{s.points}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold">Monitoreo en vivo</h1>
            {data.round && (
              <p className="text-sm text-muted">
                Ronda {data.round.roundNumber} · {data.round.pendingGames} pendientes
              </p>
            )}
          </div>
          <a href="/admin" className="btn-pill border-2 border-ink px-4 py-2 text-sm font-semibold">
            Ir al admin
          </a>
        </div>

        {data.games.length > 0 ? (
          <div className={`grid gap-3 ${gridCols}`}>
            {data.games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-bg p-8 text-center text-muted">Sin ronda activa</p>
        )}
      </div>

      <aside className="space-y-4">
        <div className="section-dark rounded-3xl p-5">
          <h2 className="font-display mb-3 font-bold">Clasificación</h2>
          <ol className="space-y-2 text-sm">
            {data.standingsTop.map((s, i) => (
              <li key={s.name} className="flex justify-between">
                <span>
                  {i + 1}. {s.name}
                </span>
                <span className="font-display font-bold">{s.points}</span>
              </li>
            ))}
          </ol>
          <a href="/clasificacion" className="mt-3 block text-sm text-white/70 hover:text-white">
            Ver tabla completa →
          </a>
        </div>

        {data.recentResults.length > 0 && (
          <div className="card-light rounded-3xl p-5">
            <h2 className="font-display mb-3 font-bold">Últimos resultados</h2>
            <ul className="space-y-2 text-sm text-muted">
              {data.recentResults.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <a
          href="/kiosk"
          className="block rounded-2xl border border-border bg-surface p-4 text-center text-sm font-medium hover:bg-bg"
        >
          Abrir vista kiosk para proyección
        </a>
      </aside>
    </div>
  );
}
