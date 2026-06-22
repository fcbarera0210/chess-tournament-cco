import type { APIRoute } from 'astro';
import { getActiveTournament } from '../../../lib/tournament';
import { buildTournamentArchive } from '../../../lib/tournament-archive';

export const prerender = false;

export const GET: APIRoute = async () => {
  const tournament = await getActiveTournament();
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }

  const archive = await buildTournamentArchive(tournament.id);

  return new Response(
    JSON.stringify({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        eventDate: tournament.eventDate,
        eventTimeStart: tournament.eventTimeStart,
        eventTimeEnd: tournament.eventTimeEnd,
        venue: tournament.venue,
        venueMapsUrl: tournament.venueMapsUrl,
        format: tournament.format,
        timeControl: tournament.timeControl,
        plannedRounds: tournament.plannedRounds,
        status: tournament.status,
      },
      ...archive,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
