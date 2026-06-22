import type { APIRoute } from 'astro';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { rounds } from '../../../lib/db/schema';
import { getGamesForRound } from '../../../lib/tournament';
import { requireAdminTournament } from '../../../lib/admin-tournament-context';
import { withAdmin } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const roundNumber = parseInt(params.roundNumber ?? '0', 10);
    if (!roundNumber) {
      return new Response(JSON.stringify({ error: 'Número de ronda inválido' }), { status: 400 });
    }

    const [round] = await db
      .select()
      .from(rounds)
      .where(and(eq(rounds.tournamentId, tournament.id), eq(rounds.roundNumber, roundNumber)))
      .limit(1);

    if (!round) {
      return new Response(JSON.stringify({ error: 'Ronda no encontrada' }), { status: 404 });
    }

    const games = await getGamesForRound(round.id);

    return new Response(JSON.stringify({ round, games }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
