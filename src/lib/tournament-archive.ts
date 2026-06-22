import { eq, asc } from 'drizzle-orm';
import { db } from './db';
import { players, rounds } from './db/schema';
import { getGamesForRound } from './tournament';
import { computeStandings } from './standings';
import { formatResult } from './standings-calc';

export function formatResultNotation(result: string): string {
  switch (result) {
    case 'white':
      return '1-0';
    case 'black':
      return '0-1';
    case 'draw':
      return '1/2-1/2';
    case 'bye':
      return 'bye';
    case 'forfeit_white':
      return '0-1 (forfeit white)';
    case 'forfeit_black':
      return '1-0 (forfeit black)';
    case 'pending':
      return '';
    default:
      return result;
  }
}

export async function buildTournamentArchive(tournamentId: string) {
  const standings = await computeStandings(tournamentId);

  const participantRows = await db
    .select({
      id: players.id,
      name: players.name,
      clubLevel: players.clubLevel,
      status: players.status,
    })
    .from(players)
    .where(eq(players.tournamentId, tournamentId))
    .orderBy(asc(players.name));

  const roundRows = await db
    .select()
    .from(rounds)
    .where(eq(rounds.tournamentId, tournamentId))
    .orderBy(asc(rounds.roundNumber));

  const roundsWithGames = await Promise.all(
    roundRows.map(async (round) => {
      const games = await getGamesForRound(round.id);
      return {
        roundNumber: round.roundNumber,
        status: round.status,
        games: games.map((g) => ({
          boardNumber: g.boardNumber,
          whiteName: g.whiteName,
          blackName: g.blackName,
          result: g.result,
          resultLabel: formatResult(g.result, g.whiteName, g.blackName),
          resultNotation: formatResultNotation(g.result),
          isBye: g.isBye,
        })),
      };
    }),
  );

  return {
    standings,
    participants: participantRows.filter((p) => p.status !== 'withdrawn'),
    rounds: roundsWithGames,
  };
}
