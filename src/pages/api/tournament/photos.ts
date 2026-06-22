import type { APIRoute } from 'astro';
import { eq, asc } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { tournamentPhotos } from '../../../lib/db/schema';
import { getTournamentBySlug } from '../../../lib/tournament';
import { withAdmin } from '../../../lib/session';
import { requireAdminTournament } from '../../../lib/admin-tournament-context';

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

  const photos = await db
    .select({
      id: tournamentPhotos.id,
      url: tournamentPhotos.url,
      caption: tournamentPhotos.caption,
      sortOrder: tournamentPhotos.sortOrder,
    })
    .from(tournamentPhotos)
    .where(eq(tournamentPhotos.tournamentId, tournament.id))
    .orderBy(asc(tournamentPhotos.sortOrder), asc(tournamentPhotos.createdAt));

  return new Response(JSON.stringify({ photos }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const caption = typeof body.caption === 'string' ? body.caption.trim() || null : null;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL requerida' }), { status: 400 });
    }

    const existing = await db
      .select({ sortOrder: tournamentPhotos.sortOrder })
      .from(tournamentPhotos)
      .where(eq(tournamentPhotos.tournamentId, tournament.id));

    const maxOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1);

    const [photo] = await db
      .insert(tournamentPhotos)
      .values({
        tournamentId: tournament.id,
        url,
        caption,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return new Response(JSON.stringify({ photo }), {
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
    const photoId = body.id as string | undefined;
    if (!photoId) {
      return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });
    }

    const updates: Partial<typeof tournamentPhotos.$inferInsert> = {};
    if (typeof body.caption === 'string') updates.caption = body.caption.trim() || null;
    if (typeof body.sortOrder === 'number') updates.sortOrder = body.sortOrder;

    const [photo] = await db
      .update(tournamentPhotos)
      .set(updates)
      .where(eq(tournamentPhotos.id, photoId))
      .returning();

    if (!photo || photo.tournamentId !== tournament.id) {
      return new Response(JSON.stringify({ error: 'Foto no encontrada' }), { status: 404 });
    }

    return new Response(JSON.stringify({ photo }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const DELETE: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const photoId = body.id as string | undefined;
    if (!photoId) {
      return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });
    }

    const [photo] = await db
      .select()
      .from(tournamentPhotos)
      .where(eq(tournamentPhotos.id, photoId))
      .limit(1);

    if (!photo || photo.tournamentId !== tournament.id) {
      return new Response(JSON.stringify({ error: 'Foto no encontrada' }), { status: 404 });
    }

    await db.delete(tournamentPhotos).where(eq(tournamentPhotos.id, photoId));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
