import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { games } from '../../lib/db/schema';
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

export const PATCH: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const body = await request.json();
    const { gameId, result } = body;

    if (!gameId || !result || !VALID_RESULTS.includes(result)) {
      return new Response(JSON.stringify({ error: 'gameId y result válidos requeridos' }), {
        status: 400,
      });
    }

    const [updated] = await db
      .update(games)
      .set({ result })
      .where(eq(games.id, gameId))
      .returning();

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Partida no encontrada' }), { status: 404 });
    }

    return new Response(JSON.stringify({ game: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
