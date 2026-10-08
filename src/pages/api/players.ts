import type { APIRoute } from 'astro';
import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db';
import { players, teams } from '../../lib/db/schema';
import { withAdmin } from '../../lib/session';
import { requireAdminTournament } from '../../lib/admin-tournament-context';
import { isTournamentLocked } from '../../lib/tournament';
import { invalidatePublicTournamentCache } from '../../lib/cache-invalidation';
import {
  countTeamsByTournament,
  getTeamInTournament,
  validateTeamTournamentReady,
} from '../../lib/teams';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const list = await db
      .select({
        id: players.id,
        tournamentId: players.tournamentId,
        teamId: players.teamId,
        teamName: teams.name,
        name: players.name,
        contact: players.contact,
        clubLevel: players.clubLevel,
        status: players.status,
        seed: players.seed,
        createdAt: players.createdAt,
      })
      .from(players)
      .leftJoin(teams, eq(players.teamId, teams.id))
      .where(eq(players.tournamentId, tournament.id));

    return new Response(
      JSON.stringify({ players: list, isTeamTournament: tournament.isTeamTournament }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });

export const POST: APIRoute = async ({ request, cache }) =>
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

    let body: { name?: string; contact?: string; clubLevel?: string; teamId?: string | null };
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

    let resolvedTeamId: string | null = null;
    if (tournament.isTeamTournament) {
      const teamCount = await countTeamsByTournament(tournament.id);
      const teamReadyError = validateTeamTournamentReady(teamCount);
      if (teamReadyError) {
        return new Response(JSON.stringify({ error: teamReadyError }), { status: 400 });
      }

      const teamId = typeof body.teamId === 'string' ? body.teamId.trim() : '';
      if (!teamId) {
        return new Response(JSON.stringify({ error: 'Debes asignar un equipo' }), { status: 400 });
      }
      const team = await getTeamInTournament(teamId, tournament.id);
      if (!team) {
        return new Response(JSON.stringify({ error: 'Equipo no válido' }), { status: 400 });
      }
      resolvedTeamId = team.id;
    }

    const [player] = await db
      .insert(players)
      .values({
        tournamentId: tournament.id,
        name,
        contact,
        clubLevel,
        teamId: resolvedTeamId,
        status: 'checked_in',
      })
      .returning();

    await invalidatePublicTournamentCache(cache, tournament.slug);

    return new Response(JSON.stringify({ player }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const PATCH: APIRoute = async ({ request, cache }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    let body: {
      playerId?: string;
      status?: string;
      promoteFromWaitlist?: boolean;
      name?: string;
      contact?: string;
      clubLevel?: string;
      teamId?: string | null;
    };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
    }

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

      await invalidatePublicTournamentCache(cache, tournament.slug);

      return new Response(JSON.stringify({ player: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const profileUpdates: Partial<{
      name: string;
      contact: string;
      clubLevel: string | null;
      teamId: string | null;
    }> = {};

    if (typeof body.name === 'string') {
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2) {
        return new Response(JSON.stringify({ error: 'Nombre requerido (mínimo 2 caracteres)' }), {
          status: 400,
        });
      }
      profileUpdates.name = trimmedName;
    }

    if (typeof body.contact === 'string') {
      profileUpdates.contact = body.contact.trim() || '—';
    }

    if (typeof body.clubLevel === 'string') {
      profileUpdates.clubLevel = body.clubLevel.trim() || null;
    }

    if (body.teamId !== undefined) {
      if (!tournament.isTeamTournament) {
        return new Response(
          JSON.stringify({ error: 'Este torneo no está en modo por equipos' }),
          { status: 400 },
        );
      }
      if (body.teamId === null || body.teamId === '') {
        return new Response(JSON.stringify({ error: 'Debes asignar un equipo' }), { status: 400 });
      }
      const team = await getTeamInTournament(body.teamId, tournament.id);
      if (!team) {
        return new Response(JSON.stringify({ error: 'Equipo no válido' }), { status: 400 });
      }
      profileUpdates.teamId = team.id;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const [updated] = await db
        .update(players)
        .set(profileUpdates)
        .where(and(eq(players.id, playerId), eq(players.tournamentId, tournament.id)))
        .returning();

      if (!updated) {
        return new Response(JSON.stringify({ error: 'Jugador no encontrado' }), { status: 404 });
      }

      await invalidatePublicTournamentCache(cache, tournament.slug);

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

    await invalidatePublicTournamentCache(cache, tournament.slug);

    return new Response(JSON.stringify({ player: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
