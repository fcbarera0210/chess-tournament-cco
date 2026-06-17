import { getToken } from '@auth/core/jwt';

function getAuthSecret(): string {
  const secret = import.meta.env.AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return secret;
}

export async function getAdminSession(request: Request) {
  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
    secureCookie: import.meta.env.PROD,
  });

  if (!token?.id) return null;

  return {
    id: token.id as string,
    name: (token.name as string) ?? 'admin',
  };
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function withAdmin(
  request: Request,
  handler: (session: { id: string; name: string }) => Promise<Response>,
): Promise<Response> {
  const session = await getAdminSession(request);
  if (!session) return unauthorized();
  return handler(session);
}
