import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { games, players, rounds, teams } from './db/schema';
import {
  buildStandingsFromGames,
  formatResult,
  type StandingRow,
} from './standings-calc';
import {
  buildTeamStandingsFromPlayerStandings,
  type TeamStandingRow,
} from './team-standings-calc';
import { listTeamsByTournament } from './teams';

export type { StandingRow, TeamStandingRow };
export {
  applyGameToStanding,
  buildStandingsFromGames,
  computeBuchholzCut1,
  formatResult,
  pointsForResult,
  sortStandings,
} from './standings-calc';
export { buildTeamStandingsFromPlayerStandings, sortTeamStandings } from './team-standings-calc';

export async function computeStandings(tournamentId: string): Promise<StandingRow[]> {
  const tournamentRounds = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.tournamentId, tournamentId));

  const roundIds = tournamentRounds.map((r) => r.id);

  const activePlayers = await db
    .select({
      id: players.id,
      name: players.name,
      status: players.status,
      teamId: players.teamId,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(eq(players.tournamentId, tournamentId));

  const allGames =
    roundIds.length > 0
      ? await db.select().from(games).where(inArray(games.roundId, roundIds))
      : [];

  return buildStandingsFromGames(activePlayers, allGames);
}

export async function computeTeamStandings(tournamentId: string): Promise<TeamStandingRow[]> {
  const [teamList, playerStandings, playerRows] = await Promise.all([
    listTeamsByTournament(tournamentId),
    computeStandings(tournamentId),
    db
      .select({
        id: players.id,
        teamId: players.teamId,
        status: players.status,
      })
      .from(players)
      .where(eq(players.tournamentId, tournamentId)),
  ]);

  return buildTeamStandingsFromPlayerStandings(teamList, playerStandings, playerRows);
}
