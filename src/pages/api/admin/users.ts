import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { adminUsers } from '../../../lib/db/schema';
import { hashPassword } from '../../../lib/auth';
import { withAdmin } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const users = await db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers);

    return new Response(JSON.stringify({ users }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async (session) => {
    const body = await request.json();
    const username = body.username?.trim();
    const password = body.password?.toString();

    if (!username || username.length < 3) {
      return new Response(JSON.stringify({ error: 'Usuario debe tener al menos 3 caracteres' }), {
        status: 400,
      });
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Contraseña debe tener al menos 6 caracteres' }), {
        status: 400,
      });
    }

    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Usuario ya existe' }), { status: 409 });
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

    return new Response(JSON.stringify({ user }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  });
