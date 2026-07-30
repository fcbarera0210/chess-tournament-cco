import type { APIRoute } from 'astro';
import { Auth } from '@auth/core';
import { authConfig } from '../../../lib/auth';

export const prerender = false;

function loginErrorRedirect(request: Request, code = 'Configuration') {
  const url = new URL('/admin/login', request.url);
  url.searchParams.set('error', code);
  return Response.redirect(url.toString(), 302);
}

async function handleAuth(request: Request) {
  try {
    const response = await Auth(request, authConfig);
    // Si Auth responde 5xx en el callback, redirigir al login en vez de una página vacía.
    if (response.status >= 500) {
      console.error('Auth returned', response.status, request.url);
      return loginErrorRedirect(request);
    }
    return response;
  } catch (error) {
    console.error('Auth handler error:', error);
    return loginErrorRedirect(request);
  }
}

export const GET: APIRoute = async ({ request }) => handleAuth(request);
export const POST: APIRoute = async ({ request }) => handleAuth(request);
