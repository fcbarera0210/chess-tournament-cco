import type { APIRoute } from 'astro';
import { getActiveTournament, resetTournamentData } from '../../../lib/tournament';
import { withAdmin } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const mode = body.mode;

    if (mode !== 'rounds' && mode !== 'full') {
      return new Response(JSON.stringify({ error: 'Modo inválido' }), { status: 400 });
    }

    await resetTournamentData(tournament.id, mode, tournament.status);

    return new Response(JSON.stringify({ ok: true, mode }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
