import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { tournaments } from '../../lib/db/schema';
import { getActiveTournament, getRegistrationStats, canEditFormat } from '../../lib/tournament';
import { withAdmin } from '../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const tournament = await getActiveTournament();
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }
  const stats = await getRegistrationStats(tournament.id);
  return new Response(JSON.stringify({ tournament, stats }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const updates: Partial<typeof tournaments.$inferInsert> = {};

    if (body.name) updates.name = body.name.trim();
    if (body.venue) updates.venue = body.venue.trim();
    if (body.eventTimeStart) updates.eventTimeStart = body.eventTimeStart;
    if (body.eventTimeEnd) updates.eventTimeEnd = body.eventTimeEnd;
    if (body.timeControl) updates.timeControl = body.timeControl;
    if (typeof body.maxPlayers === 'number') updates.maxPlayers = body.maxPlayers;
    if (typeof body.plannedRounds === 'number') updates.plannedRounds = body.plannedRounds;
    if (typeof body.waitlistEnabled === 'boolean') updates.waitlistEnabled = body.waitlistEnabled;

    if (body.format && canEditFormat(tournament)) {
      if (body.format === 'swiss' || body.format === 'knockout') {
        updates.format = body.format;
      }
    }

    if (body.status) {
      const allowed = ['registration_open', 'registration_closed', 'live', 'finished'];
      if (allowed.includes(body.status)) {
        updates.status = body.status;
      }
    }

    const [updated] = await db
      .update(tournaments)
      .set(updates)
      .where(eq(tournaments.id, tournament.id))
      .returning();

    return new Response(JSON.stringify({ tournament: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
