import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { games, players, rounds } from './db/schema';
import {
  buildStandingsFromGames,
  formatResult,
  type StandingRow,
} from './standings-calc';

export type { StandingRow };
export {
  applyGameToStanding,
  buildStandingsFromGames,
  computeBuchholzCut1,
  formatResult,
  pointsForResult,
  sortStandings,
} from './standings-calc';

export async function computeStandings(tournamentId: string): Promise<StandingRow[]> {
  const tournamentRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.tournamentId, tournamentId));

  const roundIds = tournamentRounds.map((r) => r.id);

  const activePlayers = await db
    .select()
    .from(players)
    .where(eq(players.tournamentId, tournamentId));

  const allGames =
    roundIds.length > 0
      ? await db.select().from(games).where(inArray(games.roundId, roundIds))
      : [];

  return buildStandingsFromGames(activePlayers, allGames);
}
