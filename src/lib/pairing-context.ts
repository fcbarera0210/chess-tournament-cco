import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from './db';
import { games, players, rounds } from './db/schema';
import { buildStandingsFromGames } from './standings-calc';
import type { PairingPlayer } from './swiss-pairing';

type FinishedGame = {
  result: string;
  isBye: boolean;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
};

export async function buildPairingContext(tournamentId: string, roundNumber: number) {
  const checkedIn = await db
    .select()
    .from(players)
    .where(and(eq(players.tournamentId, tournamentId), eq(players.status, 'checked_in')));

  const priorRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.tournamentId, tournamentId), lt(rounds.roundNumber, roundNumber)));

  const priorRoundIds = priorRounds.map((r) => r.id);
  const priorGames: FinishedGame[] =
    priorRoundIds.length > 0
      ? await db.select().from(games).where(inArray(games.roundId, priorRoundIds))
      : [];

  const finishedPriorGames = priorGames.filter((g) => g.result !== 'pending');
  const standings = buildStandingsFromGames(checkedIn, finishedPriorGames);
  const pointsByPlayer = new Map(standings.map((s) => [s.playerId, s.points]));

  const pairingPlayers: PairingPlayer[] = checkedIn.map((player) => {
    const opponentIds = new Set<string>();
    let hadBye = false;
    let whiteGames = 0;
    let blackGames = 0;

    for (const game of finishedPriorGames) {
      if (game.isBye || game.result === 'bye') {
        const byePlayerId = game.whitePlayerId ?? game.blackPlayerId;
        if (byePlayerId === player.id) hadBye = true;
        continue;
      }

      if (game.whitePlayerId === player.id && game.blackPlayerId) {
        opponentIds.add(game.blackPlayerId);
        whiteGames += 1;
      } else if (game.blackPlayerId === player.id && game.whitePlayerId) {
        opponentIds.add(game.whitePlayerId);
        blackGames += 1;
      }
    }

    return {
      id: player.id,
      name: player.name,
      points: pointsByPlayer.get(player.id) ?? 0,
      hadBye,
      createdAt: player.createdAt,
      opponentIds,
      whiteGames,
      blackGames,
    };
  });

  return {
    players: pairingPlayers,
    playerNames: new Map(checkedIn.map((p) => [p.id, p.name])),
    checkedInIds: checkedIn.map((p) => p.id),
  };
}

export async function getCheckedInPlayerIds(tournamentId: string): Promise<string[]> {
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.tournamentId, tournamentId), eq(players.status, 'checked_in')));
  return rows.map((r) => r.id);
}

export async function getPriorOpponentIds(
  tournamentId: string,
  roundNumber: number,
): Promise<Map<string, Set<string>>> {
  const priorRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(eq(rounds.tournamentId, tournamentId), lt(rounds.roundNumber, roundNumber)));

  const priorRoundIds = priorRounds.map((r) => r.id);
  if (priorRoundIds.length === 0) return new Map();

  const priorGames = await db.select().from(games).where(inArray(games.roundId, priorRoundIds));
  const opponentMap = new Map<string, Set<string>>();

  for (const game of priorGames) {
    if (game.result === 'pending' || game.isBye || game.result === 'bye') continue;
    if (game.whitePlayerId && game.blackPlayerId) {
      const whiteOpponents = opponentMap.get(game.whitePlayerId) ?? new Set<string>();
      whiteOpponents.add(game.blackPlayerId);
      opponentMap.set(game.whitePlayerId, whiteOpponents);

      const blackOpponents = opponentMap.get(game.blackPlayerId) ?? new Set<string>();
      blackOpponents.add(game.whitePlayerId);
      opponentMap.set(game.blackPlayerId, blackOpponents);
    }
  }

  return opponentMap;
}
