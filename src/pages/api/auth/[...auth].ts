import type { APIRoute } from 'astro';
import { Auth } from '@auth/core';
import { authConfig } from '../../../lib/auth';

export const prerender = false;

function loginErrorRedirect(request: Request, code = 'Configuration') {
  const url = new URL('/admin/login', request.url);
  url.searchParams.set('error', code);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

/** Auth.js puede devolver Response.redirect (headers inmutables); Astro cache las muta. */
function toMutableResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
}

async function handleAuth(request: Request) {
  try {
    const response = await Auth(request, authConfig);

    // Credenciales inválidas: Auth responde 302 a pages.error; no es fallo de servidor.
    if (response.status >= 500) {
      console.error('Auth returned', response.status, request.url);
      return loginErrorRedirect(request);
    }

    return toMutableResponse(response);
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);

    // Auth.js lanza CredentialsSignin cuando authorize() retorna null.
    if (name === 'CredentialsSignin' || /CredentialsSignin/i.test(message)) {
      return loginErrorRedirect(request, 'CredentialsSignin');
    }

    console.error('Auth handler error:', error);
    return loginErrorRedirect(request);
  }
}

export const GET: APIRoute = async ({ request }) => handleAuth(request);
export const POST: APIRoute = async ({ request }) => handleAuth(request);
