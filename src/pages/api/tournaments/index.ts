import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { tournaments } from '../../../lib/db/schema';
import { listAdminTournaments, slugExists } from '../../../lib/tournament';
import { withAdmin } from '../../../lib/session';
import { slugifyTournamentName, ensureUniqueSlug } from '../../../lib/tournament-slug';
import { validateTournamentFlags, findConflictingFeaturedRegistration } from '../../../lib/tournament-validation';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const list = await listAdminTournaments();
    return new Response(JSON.stringify({ tournaments: list }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: 'Nombre requerido' }), { status: 400 });
    }

    const baseSlug =
      typeof body.slug === 'string' && body.slug.trim()
        ? slugifyTournamentName(body.slug)
        : slugifyTournamentName(name);

    const slug = await ensureUniqueSlug(baseSlug, (s) => slugExists(s));

    const showOnHome = body.showOnHome === true;
    const publicRegistration = body.publicRegistration === true;
    const status = (body.status as string) ?? (publicRegistration ? 'registration_open' : 'draft');

    const flagError = validateTournamentFlags({ showOnHome, publicRegistration, status });
    if (flagError) {
      return new Response(JSON.stringify({ error: flagError }), { status: 400 });
    }

    if (showOnHome && status === 'registration_open') {
      const conflict = await findConflictingFeaturedRegistration(null);
      if (conflict) {
        return new Response(
          JSON.stringify({ error: `Ya hay un torneo destacado con inscripción abierta: ${conflict.name}` }),
          { status: 409 },
        );
      }
    }

    const [created] = await db
      .insert(tournaments)
      .values({
        name,
        slug,
        eventDate: (body.eventDate as string) ?? new Date().toISOString().slice(0, 10),
        eventTimeStart: (body.eventTimeStart as string) ?? '15:00',
        eventTimeEnd: (body.eventTimeEnd as string) ?? '20:00',
        venue: (body.venue as string)?.trim() || 'Por confirmar',
        venueMapsUrl:
          typeof body.venueMapsUrl === 'string' && body.venueMapsUrl.trim()
            ? body.venueMapsUrl.trim()
            : null,
        format: body.format === 'knockout' ? 'knockout' : 'swiss',
        maxPlayers: typeof body.maxPlayers === 'number' ? body.maxPlayers : 20,
        plannedRounds: typeof body.plannedRounds === 'number' ? body.plannedRounds : 4,
        timeControl: (body.timeControl as string) ?? '10+5',
        status: ['draft', 'registration_open', 'registration_closed'].includes(status)
          ? (status as typeof tournaments.$inferInsert.status)
          : 'draft',
        waitlistEnabled: body.waitlistEnabled !== false,
        showOnHome,
        publicRegistration,
      })
      .returning();

    return new Response(JSON.stringify({ tournament: created }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  });
