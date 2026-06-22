import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { games, rounds } from '../../lib/db/schema';
import { getActiveTournament, isTournamentLocked } from '../../lib/tournament';
import { withAdmin } from '../../lib/session';

export const prerender = false;

const VALID_RESULTS = [
  'pending',
  'white',
  'black',
  'draw',
  'bye',
  'forfeit_white',
  'forfeit_black',
] as const;

const PLAYABLE_RESULTS = ['white', 'black', 'draw'] as const;

export const PATCH: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    if (isTournamentLocked(tournament)) {
      return new Response(
        JSON.stringify({ error: 'El torneo está finalizado y no admite cambios' }),
        { status: 403 },
      );
    }

    const body = await request.json();
    const { gameId, result } = body;

    if (!gameId || !result || !VALID_RESULTS.includes(result)) {
      return new Response(JSON.stringify({ error: 'gameId y result válidos requeridos' }), {
        status: 400,
      });
    }

    const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (!game) {
      return new Response(JSON.stringify({ error: 'Partida no encontrada' }), { status: 404 });
    }

    const [round] = await db.select().from(rounds).where(eq(rounds.id, game.roundId)).limit(1);
    if (!round || round.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Solo se pueden modificar resultados mientras la ronda está activa' }),
        { status: 400 },
      );
    }

    if (game.isBye) {
      return new Response(JSON.stringify({ error: 'No se puede modificar un bye' }), { status: 400 });
    }

    if (!PLAYABLE_RESULTS.includes(result)) {
      return new Response(JSON.stringify({ error: 'Resultado no válido para esta partida' }), {
        status: 400,
      });
    }

    const [updated] = await db
      .update(games)
      .set({ result })
      .where(eq(games.id, gameId))
      .returning();

    return new Response(JSON.stringify({ game: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
