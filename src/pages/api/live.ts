import type { APIRoute } from 'astro';
import {
  getActiveTournament,
  getActiveRound,
  getGamesForRound,
  getRegistrationStats,
} from '../../lib/tournament';
import { computeStandings, formatResult } from '../../lib/standings';
import { db } from '../../lib/db';
import { rounds } from '../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async () => {
  const tournament = await getActiveTournament();
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }

  const stats = await getRegistrationStats(tournament.id);
  const standings = await computeStandings(tournament.id);
  const activeRound = await getActiveRound(tournament.id);

  let roundData = null;
  let games: Awaited<ReturnType<typeof getGamesForRound>> = [];
  let recentResults: string[] = [];

  if (activeRound) {
    games = await getGamesForRound(activeRound.id);
    const finished = games.filter((g) => g.result !== 'pending');
    const pending = games.filter((g) => g.result === 'pending');

    recentResults = finished
      .slice(-5)
      .reverse()
      .map((g) => `M${g.boardNumber}: ${formatResult(g.result, g.whiteName, g.blackName)}`);

    roundData = {
      id: activeRound.id,
      roundNumber: activeRound.roundNumber,
      status: activeRound.status,
      totalGames: games.length,
      finishedGames: finished.length,
      pendingGames: pending.length,
    };
  } else {
    const [lastRound] = await db
      .select()
      .from(rounds)
      .where(eq(rounds.tournamentId, tournament.id))
      .orderBy(desc(rounds.roundNumber))
      .limit(1);

    if (lastRound) {
      games = await getGamesForRound(lastRound.id);
      roundData = {
        id: lastRound.id,
        roundNumber: lastRound.roundNumber,
        status: lastRound.status,
        totalGames: games.length,
        finishedGames: games.filter((g) => g.result !== 'pending').length,
        pendingGames: 0,
      };
    }
  }

  return new Response(
    JSON.stringify({
      tournament: {
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        plannedRounds: tournament.plannedRounds,
      },
      stats,
      round: roundData,
      games: games.map((g) => ({
        id: g.id,
        boardNumber: g.boardNumber,
        whiteName: g.whiteName,
        blackName: g.blackName,
        result: g.result,
        isBye: g.isBye,
      })),
      standingsTop: standings.slice(0, 5),
      recentResults,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
