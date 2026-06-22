import type { APIRoute } from 'astro';
import { withAdmin } from '../../../lib/session';
import {
  adminTournamentCookieHeader,
  resolveAdminTournamentId,
} from '../../../lib/admin-tournament-context';
import { getTournamentById } from '../../../lib/tournament';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournamentId = await resolveAdminTournamentId(request);
    if (!tournamentId) {
      return new Response(JSON.stringify({ error: 'No hay torneos' }), { status: 404 });
    }

    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    return new Response(JSON.stringify({ tournamentId: tournament.id, tournament }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const body = await request.json();
    const tournamentId = body.tournamentId as string | undefined;
    if (!tournamentId) {
      return new Response(JSON.stringify({ error: 'tournamentId requerido' }), { status: 400 });
    }

    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    return new Response(JSON.stringify({ ok: true, tournamentId: tournament.id }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': adminTournamentCookieHeader(tournament.id),
      },
    });
  });
