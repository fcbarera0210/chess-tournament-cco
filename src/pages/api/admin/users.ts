import type { APIRoute } from 'astro';
import { count, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { adminUsers } from '../../../lib/db/schema';
import { hashPassword } from '../../../lib/auth';
import { withAdmin } from '../../../lib/session';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async (session) => {
    const users = await db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers);

    return json({ users, currentUserId: session.id });
  });

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async (session) => {
    const body = await request.json();
    const username = body.username?.trim();
    const password = body.password?.toString();

    if (!username || username.length < 3) {
      return json({ error: 'Usuario debe tener al menos 3 caracteres' }, 400);
    }

    if (!password || password.length < 6) {
      return json({ error: 'Contraseña debe tener al menos 6 caracteres' }, 400);
    }

    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (existing.length > 0) {
      return json({ error: 'Usuario ya existe' }, 409);
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(adminUsers)
      .values({
        username,
        passwordHash,
        createdBy: session.id,
      })
      .returning({
        id: adminUsers.id,
        username: adminUsers.username,
        createdAt: adminUsers.createdAt,
      });

    return json({ user }, 201);
  });

export const PATCH: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const body = await request.json();
    const userId = body.userId?.toString();
    const password = body.password?.toString();

    if (!userId) {
      return json({ error: 'Usuario no indicado' }, 400);
    }

    if (!password || password.length < 6) {
      return json({ error: 'Contraseña debe tener al menos 6 caracteres' }, 400);
    }

    const [user] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.id, userId))
      .limit(1);

    if (!user) {
      return json({ error: 'Usuario no encontrado' }, 404);
    }

    const passwordHash = await hashPassword(password);
    await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, userId));

    return json({ ok: true });
  });

export const DELETE: APIRoute = async ({ request }) =>
  withAdmin(request, async (session) => {
    const body = await request.json();
    const userId = body.userId?.toString();

    if (!userId) {
      return json({ error: 'Usuario no indicado' }, 400);
    }

    if (userId === session.id) {
      return json({ error: 'No puedes eliminar tu propia cuenta' }, 400);
    }

    const [user] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.id, userId))
      .limit(1);

    if (!user) {
      return json({ error: 'Usuario no encontrado' }, 404);
    }

    const [{ value: total }] = await db.select({ value: count() }).from(adminUsers);

    if (total <= 1) {
      return json({ error: 'Debe quedar al menos un administrador' }, 400);
    }

    await db.delete(adminUsers).where(eq(adminUsers.id, userId));

    return json({ ok: true });
  });
