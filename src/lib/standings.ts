import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { games, players, rounds } from './db/schema';

export type StandingRow = {
  playerId: string;
  name: string;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
};

function pointsForResult(
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

export async function computeStandings(tournamentId: string): Promise<StandingRow[]> {
  const tournamentRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.tournamentId, tournamentId));

  const roundIds = tournamentRounds.map((r) => r.id);

  const activePlayers = await db
    .select()
    .from(players)
    .where(
      eq(players.tournamentId, tournamentId),
    );

  const allGames =
    roundIds.length > 0
      ? await db.select().from(games).where(inArray(games.roundId, roundIds))
      : [];

  const standingsMap = new Map<string, StandingRow>();

  for (const player of activePlayers) {
    if (player.status === 'withdrawn') continue;
    standingsMap.set(player.id, {
      playerId: player.id,
      name: player.name,
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    });
  }

  for (const game of allGames) {
    if (game.result === 'pending') continue;

    const involved = [game.whitePlayerId, game.blackPlayerId].filter(Boolean) as string[];

    for (const playerId of involved) {
      const row = standingsMap.get(playerId);
      if (!row) continue;

      const pts = pointsForResult(game.result, playerId, game.whitePlayerId, game.blackPlayerId);
      row.points += pts;

      if (game.result !== 'bye') {
        row.gamesPlayed += 1;
        if (pts === 1) row.wins += 1;
        else if (pts === 0.5) row.draws += 1;
        else row.losses += 1;
      } else if (pts === 1) {
        row.wins += 1;
      }
    }

    if (game.isBye && game.whitePlayerId) {
      const row = standingsMap.get(game.whitePlayerId);
      if (row && game.result === 'bye') {
        row.points += 1;
        row.wins += 1;
      }
    }
  }

  return Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name, 'es');
  });
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
