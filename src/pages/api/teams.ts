import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { players, teams } from '../../lib/db/schema';
import { withAdmin } from '../../lib/session';
import { requireAdminTournament } from '../../lib/admin-tournament-context';
import { getTournamentBySlug, isTournamentLocked } from '../../lib/tournament';
import {
  findTeamByName,
  getTeamInTournament,
  listTeamsByTournament,
} from '../../lib/teams';
import { invalidatePublicTournamentCache } from '../../lib/cache-invalidation';
import { publicApiCacheHeaders } from '../../lib/public-cache';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const slug = url.searchParams.get('slug');
  if (slug) {
    const tournament = await getTournamentBySlug(slug);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const list = tournament.isTeamTournament
      ? await listTeamsByTournament(tournament.id)
      : [];

    return new Response(
      JSON.stringify({
        isTeamTournament: tournament.isTeamTournament,
        teams: list.map((team) => ({ id: team.id, name: team.name })),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...publicApiCacheHeaders('registration'),
        },
      },
    );
  }

  return withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const list = await listTeamsByTournament(tournament.id);
    const playerRows = await db
      .select({ id: players.id, teamId: players.teamId, status: players.status })
      .from(players)
      .where(eq(players.tournamentId, tournament.id));

    const memberCountByTeam = new Map<string, number>();
    for (const player of playerRows) {
      if (!player.teamId || player.status === 'withdrawn') continue;
      memberCountByTeam.set(player.teamId, (memberCountByTeam.get(player.teamId) ?? 0) + 1);
    }

    return new Response(
      JSON.stringify({
        isTeamTournament: tournament.isTeamTournament,
        teams: list.map((team) => ({
          ...team,
          memberCount: memberCountByTeam.get(team.id) ?? 0,
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  });
};

export const POST: APIRoute = async ({ request, cache }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    if (!tournament.isTeamTournament) {
      return new Response(
        JSON.stringify({ error: 'Activa el modo por equipos en la configuración del torneo' }),
        { status: 400 },
      );
    }

    if (isTournamentLocked(tournament)) {
      return new Response(JSON.stringify({ error: 'El torneo finalizado no admite cambios' }), {
        status: 403,
      });
    }

    let body: { name?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: 'Nombre de equipo requerido (mínimo 2 caracteres)' }), {
        status: 400,
      });
    }

    const existing = await findTeamByName(tournament.id, name);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Ya existe un equipo con ese nombre' }), {
        status: 409,
      });
    }

    const [team] = await db
      .insert(teams)
      .values({ tournamentId: tournament.id, name })
      .returning();

    await invalidatePublicTournamentCache(cache, tournament.slug);

    return new Response(JSON.stringify({ team }), {
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

    if (isTournamentLocked(tournament)) {
      return new Response(JSON.stringify({ error: 'El torneo finalizado no admite cambios' }), {
        status: 403,
      });
    }

    let body: { teamId?: string; name?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
    }

    if (!body.teamId) {
      return new Response(JSON.stringify({ error: 'teamId requerido' }), { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: 'Nombre de equipo requerido (mínimo 2 caracteres)' }), {
        status: 400,
      });
    }

    const current = await getTeamInTournament(body.teamId, tournament.id);
    if (!current) {
      return new Response(JSON.stringify({ error: 'Equipo no encontrado' }), { status: 404 });
    }

    const existing = await findTeamByName(tournament.id, name, body.teamId);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Ya existe un equipo con ese nombre' }), {
        status: 409,
      });
    }

    const [team] = await db
      .update(teams)
      .set({ name })
      .where(and(eq(teams.id, body.teamId), eq(teams.tournamentId, tournament.id)))
      .returning();

    await invalidatePublicTournamentCache(cache, tournament.slug);

    return new Response(JSON.stringify({ team }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const DELETE: APIRoute = async ({ request, cache }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    if (isTournamentLocked(tournament)) {
      return new Response(JSON.stringify({ error: 'El torneo finalizado no admite cambios' }), {
        status: 403,
      });
    }

    let body: { teamId?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
    }

    if (!body.teamId) {
      return new Response(JSON.stringify({ error: 'teamId requerido' }), { status: 400 });
    }

    const current = await getTeamInTournament(body.teamId, tournament.id);
    if (!current) {
      return new Response(JSON.stringify({ error: 'Equipo no encontrado' }), { status: 404 });
    }

    await db
      .update(players)
      .set({ teamId: null })
      .where(and(eq(players.tournamentId, tournament.id), eq(players.teamId, body.teamId)));

    await db
      .delete(teams)
      .where(and(eq(teams.id, body.teamId), eq(teams.tournamentId, tournament.id)));

    await invalidatePublicTournamentCache(cache, tournament.slug);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
