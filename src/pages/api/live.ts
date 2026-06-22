import type { APIRoute } from 'astro';
import {
  getTournamentBySlug,
  getActiveRound,
  getGamesForRound,
  getRegistrationStats,
} from '../../lib/tournament';
import { computeStandings, formatResult } from '../../lib/standings';
import { db } from '../../lib/db';
import { rounds } from '../../lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const prerender = false;

type RecentResult = {
  id: string;
  boardNumber: number;
  result: string;
  whiteName: string | null;
  blackName: string | null;
  isBye: boolean;
  label: string;
};

async function getPreviousRoundResults(tournamentId: string, currentRoundNumber: number) {
  if (currentRoundNumber <= 1) {
    return { results: [] as RecentResult[], roundNumber: null as number | null };
  }

  const [prevRound] = await db
    .select()
    .from(rounds)
    .where(
      and(
        eq(rounds.tournamentId, tournamentId),
        eq(rounds.roundNumber, currentRoundNumber - 1),
      ),
    )
    .limit(1);

  if (!prevRound) {
    return { results: [] as RecentResult[], roundNumber: null as number | null };
  }

  const prevGames = await getGamesForRound(prevRound.id);
  const results = prevGames
    .filter((g) => g.result !== 'pending')
    .map((g) => ({
      id: g.id,
      boardNumber: g.boardNumber,
      result: g.result,
      whiteName: g.whiteName,
      blackName: g.blackName,
      isBye: g.isBye,
      label: formatResult(g.result, g.whiteName, g.blackName),
    }));

  return { results, roundNumber: prevRound.roundNumber };
}

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });
  }

  const tournament = await getTournamentBySlug(slug);
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }

  const stats = await getRegistrationStats(tournament.id);
  const standings = await computeStandings(tournament.id);
  const activeRound = await getActiveRound(tournament.id);

  let roundData = null;
  let games: Awaited<ReturnType<typeof getGamesForRound>> = [];
  let recentResults: RecentResult[] = [];
  let recentResultsRoundNumber: number | null = null;

  if (activeRound) {
    games = await getGamesForRound(activeRound.id);
    const finished = games.filter((g) => g.result !== 'pending');
    const pending = games.filter((g) => g.result === 'pending');

    const previous = await getPreviousRoundResults(tournament.id, activeRound.roundNumber);
    recentResults = previous.results;
    recentResultsRoundNumber = previous.roundNumber;

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

      const previous = await getPreviousRoundResults(tournament.id, lastRound.roundNumber);
      recentResults = previous.results;
      recentResultsRoundNumber = previous.roundNumber;

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
        timeControl: tournament.timeControl,
        venue: tournament.venue,
        eventTimeStart: tournament.eventTimeStart,
        eventTimeEnd: tournament.eventTimeEnd,
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
      recentResultsRoundNumber,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
