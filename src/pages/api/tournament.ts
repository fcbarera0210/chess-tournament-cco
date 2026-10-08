import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { tournaments } from '../../lib/db/schema';
import { getRegistrationStats } from '../../lib/tournament';
import { withAdmin } from '../../lib/session';
import { resolveAdminTournamentId } from '../../lib/admin-tournament-context';
import { getTournamentById } from '../../lib/tournament';
import { buildTournamentUpdates, assertFeaturedRegistrationUnique } from '../../lib/tournament-update';
import { invalidatePublicTournamentCache } from '../../lib/cache-invalidation';
import {
  countTeamsByTournament,
  deleteTeamsForTournament,
  validateTeamTournamentReady,
} from '../../lib/teams';

export const prerender = false;

async function loadAdminTournament(request: Request) {
  const tournamentId = await resolveAdminTournamentId(request);
  if (!tournamentId) return null;
  return getTournamentById(tournamentId);
}

export const GET: APIRoute = async ({ request }) => {
  const tournament = await loadAdminTournament(request);
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }
  const stats = await getRegistrationStats(tournament.id);
  return new Response(JSON.stringify({ tournament, stats }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ request, cache }) =>
  withAdmin(request, async () => {
    const tournament = await loadAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const { updates, error } = buildTournamentUpdates(body, tournament);
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 400 });
    }

    const merged = { ...tournament, ...updates };
    const conflictError = await assertFeaturedRegistrationUnique(tournament.id, merged);
    if (conflictError) {
      return new Response(JSON.stringify({ error: conflictError }), { status: 409 });
    }

    if (merged.isTeamTournament && updates.status === 'live') {
      const teamCount = await countTeamsByTournament(tournament.id);
      const teamError = validateTeamTournamentReady(teamCount);
      if (teamError) {
        return new Response(JSON.stringify({ error: teamError }), { status: 400 });
      }
    }

    if (updates.isTeamTournament === false && tournament.isTeamTournament) {
      await deleteTeamsForTournament(tournament.id);
    }

    const [updated] = await db
      .update(tournaments)
      .set(updates)
      .where(eq(tournaments.id, tournament.id))
      .returning();

    await invalidatePublicTournamentCache(cache, updated.slug);

    return new Response(JSON.stringify({ tournament: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
