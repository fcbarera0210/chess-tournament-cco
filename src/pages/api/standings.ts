import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { players } from '../../lib/db/schema';
import { getTournamentBySlug } from '../../lib/tournament';
import { computeStandings } from '../../lib/standings';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });
  }

  const tournament = await getTournamentBySlug(slug);
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }

  const standings = await computeStandings(tournament.id);
  const registeredPlayers = await db
    .select({ id: players.id, name: players.name, status: players.status })
    .from(players)
    .where(eq(players.tournamentId, tournament.id));

  return new Response(
    JSON.stringify({
      tournament: {
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        plannedRounds: tournament.plannedRounds,
      },
      standings,
      players: registeredPlayers.filter((p) => p.status !== 'withdrawn'),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
