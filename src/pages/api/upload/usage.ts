import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { tournamentPhotos } from '../../../lib/db/schema';
import { withAdmin } from '../../../lib/session';

export const prerender = false;

const BLOB_DOMAIN = '.blob.vercel-storage.com/';

function normalizeUrl(url: string | null | undefined): string {
  if (url == null || url === '') return '';
  const u = String(url).trim();
  const q = u.indexOf('?');
  return q !== -1 ? u.slice(0, q) : u;
}

async function getPhotoUrls(): Promise<string[]> {
  const rows = await db.select({ url: tournamentPhotos.url }).from(tournamentPhotos);
  return rows.map((r) => normalizeUrl(r.url));
}

export const GET: APIRoute = async ({ request, url }) => {
  const checkUrl = url.searchParams.get('url');
  if (checkUrl) {
    return withAdmin(request, async () => {
      if (!checkUrl.startsWith('https://') || !checkUrl.includes(BLOB_DOMAIN)) {
        return new Response(JSON.stringify({ error: 'URL inválida de Vercel Blob' }), {
          status: 400,
        });
      }

      const blobBase = normalizeUrl(checkUrl);
      const urls = await getPhotoUrls();
      const inGallery = urls.some((u) => u === blobBase);

      return new Response(JSON.stringify({ usedIn: { gallery: inGallery } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  }

  return new Response(JSON.stringify({ error: 'Falta parámetro url' }), { status: 400 });
};

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    let body: { urls?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Body JSON inválido' }), { status: 400 });
    }

    const urls = body.urls;
    if (!Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: 'Se requiere "urls"' }), { status: 400 });
    }

    const validUrls = urls.filter(
      (u): u is string =>
        typeof u === 'string' && u.startsWith('https://') && u.includes(BLOB_DOMAIN),
    );

    if (validUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Ninguna URL válida' }), { status: 400 });
    }

    const stored = await getPhotoUrls();
    const inUse = validUrls.filter((url) => stored.includes(normalizeUrl(url)));

    return new Response(JSON.stringify({ inUse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
