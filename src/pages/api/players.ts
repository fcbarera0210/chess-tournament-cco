import type { APIRoute } from 'astro';
import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db';
import { players } from '../../lib/db/schema';
import { withAdmin } from '../../lib/session';
import { requireAdminTournament } from '../../lib/admin-tournament-context';
import { isTournamentLocked } from '../../lib/tournament';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
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

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    if (isTournamentLocked(tournament)) {
      return new Response(
        JSON.stringify({ error: 'El torneo está finalizado y no admite inscripciones' }),
        { status: 403 },
      );
    }

    let body: { name?: string; contact?: string; clubLevel?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: 'Nombre requerido (mínimo 2 caracteres)' }), {
        status: 400,
      });
    }

    const contact =
      typeof body.contact === 'string' && body.contact.trim() ? body.contact.trim() : '—';
    const clubLevel =
      typeof body.clubLevel === 'string' && body.clubLevel.trim()
        ? body.clubLevel.trim()
        : null;

    const [player] = await db
      .insert(players)
      .values({
        tournamentId: tournament.id,
        name,
        contact,
        clubLevel,
        status: 'checked_in',
      })
      .returning();

    return new Response(JSON.stringify({ player }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const PATCH: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
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
        .where(and(eq(players.id, playerId), eq(players.tournamentId, tournament.id)))
        .returning();

      if (!updated) {
        return new Response(JSON.stringify({ error: 'Jugador no encontrado' }), { status: 404 });
      }

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
      .where(and(eq(players.id, playerId), eq(players.tournamentId, tournament.id)))
      .returning();

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Jugador no encontrado' }), { status: 404 });
    }

    return new Response(JSON.stringify({ player: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
