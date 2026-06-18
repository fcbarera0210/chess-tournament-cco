export type StandingRow = {
  playerId: string;
  name: string;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  buchholzCut1: number;
};

type GameLike = {
  result: string;
  isBye: boolean;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
};

export function pointsForResult(
  result: string,
  playerId: string,
  whiteId: string | null,
  blackId: string | null,
): number {
  if (result === 'bye') {
    return whiteId === playerId || blackId === playerId ? 1 : 0;
  }
  if (result === 'draw') return 0.5;
  if (result === 'white') return whiteId === playerId ? 1 : blackId === playerId ? 0 : 0;
  if (result === 'black') return blackId === playerId ? 1 : whiteId === playerId ? 0 : 0;
  if (result === 'forfeit_white') return blackId === playerId ? 1 : 0;
  if (result === 'forfeit_black') return whiteId === playerId ? 1 : 0;
  return 0;
}

export function applyGameToStanding(row: StandingRow, game: GameLike, playerId: string) {
  if (game.result === 'pending') return;

  if (game.isBye || game.result === 'bye') {
    const byePlayerId = game.whitePlayerId ?? game.blackPlayerId;
    if (playerId !== byePlayerId) return;
    row.points += 1;
    row.wins += 1;
    return;
  }

  const pts = pointsForResult(game.result, playerId, game.whitePlayerId, game.blackPlayerId);
  row.points += pts;
  row.gamesPlayed += 1;
  if (pts === 1) row.wins += 1;
  else if (pts === 0.5) row.draws += 1;
  else row.losses += 1;
}

export function collectOpponents(finishedGames: GameLike[], playerId: string): string[] {
  const opponents: string[] = [];
  for (const game of finishedGames) {
    if (game.result === 'pending' || game.isBye || game.result === 'bye') continue;
    if (game.whitePlayerId === playerId && game.blackPlayerId) {
      opponents.push(game.blackPlayerId);
    } else if (game.blackPlayerId === playerId && game.whitePlayerId) {
      opponents.push(game.whitePlayerId);
    }
  }
  return opponents;
}

export function computeBuchholzCut1(
  opponents: string[],
  pointsByPlayer: Map<string, number>,
): number {
  if (opponents.length === 0) return 0;
  const opponentPoints = opponents.map((id) => pointsByPlayer.get(id) ?? 0);
  const sum = opponentPoints.reduce((acc, pts) => acc + pts, 0);
  const min = Math.min(...opponentPoints);
  return sum - min;
}

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholzCut1 !== a.buchholzCut1) return b.buchholzCut1 - a.buchholzCut1;
    return a.name.localeCompare(b.name, 'es');
  });
}

export function buildStandingsFromGames(
  playerList: { id: string; name: string; status: string }[],
  allGames: GameLike[],
): StandingRow[] {
  const standingsMap = new Map<string, StandingRow>();

  for (const player of playerList) {
    if (player.status === 'withdrawn') continue;
    standingsMap.set(player.id, {
      playerId: player.id,
      name: player.name,
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholzCut1: 0,
    });
  }

  const finishedGames = allGames.filter((g) => g.result !== 'pending');

  for (const game of finishedGames) {
    if (game.isBye || game.result === 'bye') {
      const byePlayerId = game.whitePlayerId ?? game.blackPlayerId;
      if (!byePlayerId) continue;
      const row = standingsMap.get(byePlayerId);
      if (row) applyGameToStanding(row, game, byePlayerId);
      continue;
    }

    for (const playerId of [game.whitePlayerId, game.blackPlayerId].filter(Boolean) as string[]) {
      const row = standingsMap.get(playerId);
      if (row) applyGameToStanding(row, game, playerId);
    }
  }

  const pointsByPlayer = new Map<string, number>();
  for (const [id, row] of standingsMap) {
    pointsByPlayer.set(id, row.points);
  }

  for (const row of standingsMap.values()) {
    const opponents = collectOpponents(finishedGames, row.playerId);
    row.buchholzCut1 = computeBuchholzCut1(opponents, pointsByPlayer);
  }

  return sortStandings(Array.from(standingsMap.values()));
}

export function formatResult(
  result: string,
  whiteName: string | null,
  blackName: string | null,
): string {
  switch (result) {
    case 'white':
      return `${whiteName} 1-0 ${blackName}`;
    case 'black':
      return `${whiteName} 0-1 ${blackName}`;
    case 'draw':
      return `${whiteName} ½-½ ${blackName}`;
    case 'bye':
      return `${whiteName ?? blackName} — bye`;
    case 'forfeit_white':
      return `${blackName} gana por no presentado`;
    case 'forfeit_black':
      return `${whiteName} gana por no presentado`;
    default:
      return 'En juego';
  }
}
