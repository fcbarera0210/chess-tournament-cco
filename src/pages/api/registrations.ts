import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { players } from '../../lib/db/schema';
import {
  getActiveTournament,
  getRegistrationStats,
  isRegistrationOpen,
} from '../../lib/tournament';
import { checkRateLimit } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Espera un momento.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tournament = await getActiveTournament();
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    name?: string;
    contact?: string;
    clubLevel?: string;
    confirmed?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = body.name?.trim();
  const contact = body.contact?.trim();
  const clubLevel = body.clubLevel?.trim() || null;

  if (!name || name.length < 2) {
    return new Response(JSON.stringify({ error: 'Nombre requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!contact || contact.length < 5) {
    return new Response(JSON.stringify({ error: 'Contacto requerido (email o teléfono)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.confirmed) {
    return new Response(JSON.stringify({ error: 'Debes confirmar tu asistencia' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stats = await getRegistrationStats(tournament.id);
  const open = isRegistrationOpen(tournament, stats.registered);
  const canWaitlist =
    tournament.waitlistEnabled &&
    tournament.status === 'registration_open' &&
    stats.registered >= tournament.maxPlayers;

  if (!open && !canWaitlist) {
    return new Response(JSON.stringify({ error: 'Inscripciones cerradas o cupo completo' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const status = open ? 'registered' : 'waitlist';

  const [player] = await db
    .insert(players)
    .values({
      tournamentId: tournament.id,
      name,
      contact,
      clubLevel,
      status,
    })
    .returning();

  return new Response(
    JSON.stringify({
      success: true,
      status,
      player: { id: player.id, name: player.name },
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
};

export const GET: APIRoute = async () => {
  const tournament = await getActiveTournament();
  if (!tournament) {
    return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
  }

  const stats = await getRegistrationStats(tournament.id);

  return new Response(
    JSON.stringify({
      tournament: {
        name: tournament.name,
        eventDate: tournament.eventDate,
        eventTimeStart: tournament.eventTimeStart,
        eventTimeEnd: tournament.eventTimeEnd,
        venue: tournament.venue,
        status: tournament.status,
        maxPlayers: tournament.maxPlayers,
      },
      stats,
      spotsRemaining: Math.max(0, tournament.maxPlayers - stats.registered),
      registrationOpen: isRegistrationOpen(tournament, stats.registered),
      waitlistAvailable:
        tournament.waitlistEnabled &&
        tournament.status === 'registration_open' &&
        stats.registered >= tournament.maxPlayers,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
