import { useEffect, useState } from 'react';
import { pieceSrc, resultWinnerColors, type PieceColor } from '../../lib/chess-pieces';
import { publicApiUrl } from '../../lib/admin-api';

type Game = {
  id: string;
  boardNumber: number;
  whiteName: string | null;
  blackName: string | null;
  result: string;
  isBye: boolean;
};

type RecentResult = {
  id: string;
  boardNumber: number;
  result: string;
  whiteName: string | null;
  blackName: string | null;
  isBye: boolean;
  label: string;
};

type LiveData = {
  tournament: {
    name: string;
    status: string;
    plannedRounds: number;
  };
  round: {
    roundNumber: number;
    status: string;
    totalGames: number;
    finishedGames: number;
    pendingGames: number;
  } | null;
  games: Game[];
  standingsTop: { name: string; points: number; buchholzCut1: number }[];
  recentResults: RecentResult[];
  recentResultsRoundNumber: number | null;
};

function ResultPieceIcons({
  colors,
  seed,
  className = 'h-[1em] w-auto shrink-0',
}: {
  colors: PieceColor[];
  seed: string;
  className?: string;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {colors.map((color) => (
        <img
          key={color}
          src={pieceSrc(color, `${seed}-${color}`)}
          alt=""
          width="16"
          height="16"
          className={className}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function RecentResultLine({ item }: { item: RecentResult }) {
  const colors = resultWinnerColors(item.result, item.whiteName, item.blackName);

  return (
    <li className="flex items-start gap-1.5">
      {colors.length > 0 && <ResultPieceIcons colors={colors} seed={item.id} />}
      <span>
        M{item.boardNumber}: {item.label}
      </span>
    </li>
  );
}

function KioskClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="shrink-0 text-xl tabular-nums text-white/70">
      {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function KioskHomeLink({ className = '' }: { className?: string }) {
  return (
    <a
      href="/"
      className={`rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 ${className}`}
    >
      ← Inicio
    </a>
  );
}

function KioskSidebar({
  slug,
  standingsTop,
  recentResults,
  recentResultsRoundNumber,
}: {
  slug: string;
  standingsTop: LiveData['standingsTop'];
  recentResults: RecentResult[];
  recentResultsRoundNumber: number | null;
}) {
  return (
    <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-4">
      {standingsTop.length > 0 && (
        <div className="kiosk-panel p-4">
          <h2 className="font-display mb-3 text-base font-bold">Top 5</h2>
          <ol className="space-y-1.5 text-sm text-white/90">
            {standingsTop.map((s, i) => (
              <li key={s.name} className="flex justify-between gap-3">
                <span className="truncate">
                  {i + 1}. {s.name}
                </span>
                <span className="font-display shrink-0 font-bold">{s.points}</span>
              </li>
            ))}
          </ol>
          <a
            href={`/clasificacion/${slug}`}
            className="mt-3 block text-sm text-white/60 hover:text-white"
          >
            Ver tabla completa →
          </a>
        </div>
      )}

      <div className="kiosk-panel p-4">
        <h2 className="font-display mb-3 text-base font-bold">
          {recentResultsRoundNumber
            ? `Ronda ${recentResultsRoundNumber}`
            : 'Últimos resultados'}
        </h2>
        {recentResults.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-white/80">
            {recentResults.map((r) => (
              <RecentResultLine key={r.id} item={r} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">Sin ronda anterior</p>
        )}
      </div>
    </aside>
  );
}

function PlayerLine({
  name,
  color,
  seed,
  large,
}: {
  name: string | null;
  color: 'w' | 'b';
  seed: string;
  large?: boolean;
}) {
  return (
    <p className={`flex items-center gap-2 font-semibold ${large ? 'text-2xl' : 'text-lg'}`}>
      <img
        src={pieceSrc(color, seed)}
        alt=""
        width="24"
        height="24"
        className="h-[1em] w-auto shrink-0"
        aria-hidden="true"
      />
      <span>{name ?? '—'}</span>
    </p>
  );
}

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

function GameCard({
  game,
  large,
  kiosk,
  roundActive = false,
}: {
  game: Game;
  large?: boolean;
  kiosk?: boolean;
  roundActive?: boolean;
}) {
  const finished = game.result !== 'pending';
  const waiting = !finished && !roundActive;

  const statusLabel = finished ? 'Finalizada' : waiting ? 'En espera' : 'En juego';
  const statusClass = finished
    ? 'bg-finished/10 text-finished'
    : waiting
      ? 'bg-bg text-muted'
      : 'bg-pending/10 text-pending';
  const ringClass = finished
    ? 'ring-finished/30'
    : waiting
      ? 'ring-border'
      : 'ring-pending/40';

  return (
    <div
      className={`p-4 ${kiosk ? 'kiosk-card-light rounded-3xl' : 'rounded-3xl border border-border bg-white text-ink shadow-sm'} ${large ? 'p-6' : ''} ring-2 ${ringClass}`}
    >
      <div className={`mb-3 flex items-center justify-between ${large ? 'text-lg' : 'text-sm'}`}>
        <span className="font-display font-bold">Mesa {game.boardNumber}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      {game.isBye ? (
        <p className={`flex items-center gap-2 font-semibold ${large ? 'text-2xl' : 'text-lg'}`}>
          <img
            src={pieceSrc(game.whiteName ? 'w' : 'b', `${game.id}-${game.whiteName ? 'w' : 'b'}`)}
            alt=""
            width="24"
            height="24"
            className="h-[1em] w-auto shrink-0"
            aria-hidden="true"
          />
          <span>{game.whiteName ?? game.blackName} — descansa</span>
        </p>
      ) : (
        <div className={large ? 'space-y-2 text-2xl' : 'space-y-1 text-lg'}>
          <PlayerLine
            name={game.whiteName}
            color="w"
            seed={`${game.id}-w`}
            large={large}
          />
          <p className={`text-center font-display font-bold ${large ? 'text-xl' : 'text-base'}`}>
            {resultLabel(game.result)}
          </p>
          <PlayerLine
            name={game.blackName}
            color="b"
            seed={`${game.id}-b`}
            large={large}
          />
        </div>
      )}
    </div>
  );
}

type Props = {
  slug: string;
  mode: 'kiosk' | 'live';
  cols?: number;
};

export function LiveView({ slug, mode, cols = 3 }: Props) {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(publicApiUrl('/api/live', slug))
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [slug]);

  const gridCols =
    cols === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : cols === 4
        ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const progressPct =
    data?.round && data.round.totalGames > 0
      ? Math.round((data.round.finishedGames / data.round.totalGames) * 100)
      : 0;

  if (!data) {
    if (mode === 'kiosk') {
      return (
        <div className="mx-auto w-full max-w-7xl">
          <div className="kiosk-shell flex min-h-[calc(100dvh-2rem)] items-center justify-center px-5 py-8 md:min-h-[calc(100dvh-3rem)] md:px-10 md:py-10">
            <div className="kiosk-panel relative w-full max-w-2xl px-6 py-12 text-center">
              <KioskHomeLink className="absolute top-4 left-4 md:top-5 md:left-5" />
              <p className="text-white/70">Cargando estado del torneo...</p>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-center text-muted">Cargando estado del torneo...</p>;
  }

  const roundActive = data.round?.status === 'active';

  if (mode === 'kiosk') {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="kiosk-shell relative min-h-[calc(100dvh-2rem)] px-5 py-8 md:min-h-[calc(100dvh-3rem)] md:px-10 md:py-10">
          <div className="relative z-10 space-y-8">
            <header className="kiosk-panel relative px-6 py-8 text-center">
              <KioskHomeLink className="absolute top-4 left-4 md:top-5 md:left-5" />
              <h1 className="font-display text-4xl font-bold md:text-5xl">{data.tournament.name}</h1>
              {data.round ? (
                <>
                  <div className="mt-3 flex items-center justify-center gap-4 md:gap-6">
                    <KioskClock />
                    <p className="text-xl text-white/70">
                      Ronda {data.round.roundNumber}
                      {roundActive
                        ? ` · ${data.round.finishedGames}/${data.round.totalGames} partidas finalizadas`
                        : data.round.status === 'draft'
                          ? ' · en preparación'
                          : ` · ${data.round.finishedGames}/${data.round.totalGames} partidas finalizadas`}
                    </p>
                  </div>
                  <div className="mx-auto mt-5 h-2.5 max-w-md overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-4 md:gap-6">
                  <KioskClock />
                  <p className="text-xl text-white/70">Torneo por comenzar</p>
                </div>
              )}
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-start xl:grid-cols-[1fr_18rem]">
              <div>
                {data.games.length > 0 ? (
                  <div className={`grid gap-4 ${gridCols}`}>
                    {data.games.map((g) => (
                      <GameCard key={g.id} game={g} large kiosk roundActive={roundActive} />
                    ))}
                  </div>
                ) : (
                  <div className="kiosk-panel px-6 py-16 text-center">
                    <p className="font-display text-2xl text-white/50">Sin ronda activa</p>
                  </div>
                )}
              </div>
              <KioskSidebar
                slug={slug}
                standingsTop={data.standingsTop}
                recentResults={data.recentResults}
                recentResultsRoundNumber={data.recentResultsRoundNumber}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Monitoreo en vivo</h1>
          {data.round && (
            <p className="text-sm text-muted">
              Ronda {data.round.roundNumber}
              {roundActive
                ? ` · ${data.round.pendingGames} pendientes`
                : data.round.status === 'draft'
                  ? ' · en preparación'
                  : ''}
            </p>
          )}
        </div>

        {data.games.length > 0 ? (
          <div className={`grid gap-3 ${gridCols}`}>
            {data.games.map((g) => (
              <GameCard key={g.id} game={g} roundActive={roundActive} />
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
          <a
            href={`/clasificacion/${slug}`}
            className="mt-3 block text-sm text-white/70 hover:text-white"
          >
            Ver tabla completa →
          </a>
        </div>

        {data.recentResults.length > 0 && (
          <div className="card-light rounded-3xl p-5">
            <h2 className="font-display mb-3 font-bold">
              {data.recentResultsRoundNumber
                ? `Ronda ${data.recentResultsRoundNumber}`
                : 'Últimos resultados'}
            </h2>
            <ul className="space-y-2 text-sm text-muted">
              {data.recentResults.map((r) => (
                <RecentResultLine key={r.id} item={r} />
              ))}
            </ul>
          </div>
        )}

        <a
          href={`/kiosk/${slug}`}
          className="block rounded-2xl border border-border bg-surface p-4 text-center text-sm font-medium hover:bg-bg"
        >
          Abrir vista kiosk para proyección
        </a>
      </aside>
    </div>
  );
}
