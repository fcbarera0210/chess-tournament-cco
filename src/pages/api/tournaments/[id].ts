import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { tournaments } from '../../../lib/db/schema';
import { getTournamentById, getRegistrationStats } from '../../../lib/tournament';
import { withAdmin } from '../../../lib/session';
import { buildTournamentUpdates, assertFeaturedRegistrationUnique } from '../../../lib/tournament-update';
import { invalidatePublicTournamentCache } from '../../../lib/cache-invalidation';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  const tournament = await getTournamentById(id);
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }

  const stats = await getRegistrationStats(tournament.id);
  return new Response(JSON.stringify({ tournament, stats }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ request, params, cache }) =>
  withAdmin(request, async () => {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    const tournament = await getTournamentById(id);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const { updates, error } = buildTournamentUpdates(body, tournament);
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 400 });
    }

    const merged = { ...tournament, ...updates };
    const conflictError = await assertFeaturedRegistrationUnique(id, merged);
    if (conflictError) {
      return new Response(JSON.stringify({ error: conflictError }), { status: 409 });
    }

    const [updated] = await db
      .update(tournaments)
      .set(updates)
      .where(eq(tournaments.id, id))
      .returning();

    await invalidatePublicTournamentCache(cache, updated.slug);

    return new Response(JSON.stringify({ tournament: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
