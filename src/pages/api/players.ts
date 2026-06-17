import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { players } from '../../lib/db/schema';
import { getActiveTournament } from '../../lib/tournament';
import { withAdmin } from '../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const list = await db
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournament.id));

    return new Response(JSON.stringify({ players: list }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const PATCH: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const { playerId, status, promoteFromWaitlist } = body;

    if (!playerId) {
      return new Response(JSON.stringify({ error: 'playerId requerido' }), { status: 400 });
    }

    if (promoteFromWaitlist) {
      const registered = await db
        .select()
        .from(players)
        .where(eq(players.tournamentId, tournament.id));

      const activeCount = registered.filter((p) =>
        ['registered', 'checked_in'].includes(p.status),
      ).length;

      if (activeCount >= tournament.maxPlayers) {
        return new Response(JSON.stringify({ error: 'Cupo completo' }), { status: 400 });
      }

      const [updated] = await db
        .update(players)
        .set({ status: 'registered' })
        .where(eq(players.id, playerId))
        .returning();

      return new Response(JSON.stringify({ player: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const allowed = ['registered', 'waitlist', 'checked_in', 'withdrawn'];
    if (!status || !allowed.includes(status)) {
      return new Response(JSON.stringify({ error: 'Estado inválido' }), { status: 400 });
    }

    const [updated] = await db
      .update(players)
      .set({ status })
      .where(eq(players.id, playerId))
      .returning();

    return new Response(JSON.stringify({ player: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
