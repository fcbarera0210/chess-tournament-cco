import type { APIRoute } from 'astro';
import { list, del } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { withAdmin } from '../../lib/session';
import {
  putPublicWebpBlob,
  getBlobToken,
  WEBP_BLOB_MAX_BYTES,
} from '../../lib/blob-webp-upload';

export const prerender = false;

const LIST_LIMIT = 50;
const BLOB_DOMAIN = '.blob.vercel-storage.com/';

function normalizeSlug(slug: string): string {
  return String(slug).trim().toLowerCase().replace(/\s+/g, '-');
}

export const GET: APIRoute = async ({ request, url }) =>
  withAdmin(request, async () => {
    try {
      const cursor = url.searchParams.get('cursor') ?? undefined;
      const prefix = url.searchParams.get('prefix') ?? undefined;
      const limitParam = url.searchParams.get('limit');
      const limit =
        limitParam != null
          ? Math.min(Math.max(1, parseInt(limitParam, 10) || LIST_LIMIT), 100)
          : LIST_LIMIT;

      const result = await list({
        cursor,
        limit,
        token: getBlobToken(),
        ...(prefix && { prefix }),
      });

      const images = result.blobs.map((b) => ({ url: b.url, pathname: b.pathname }));
      return new Response(
        JSON.stringify({ images, cursor: result.cursor, hasMore: result.hasMore }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: 'Error al listar imágenes' }), { status: 500 });
    }
  });

export const DELETE: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const urls = body.urls;
      if (!Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: 'Se requiere un array "urls"' }), {
          status: 400,
        });
      }

      const valid = urls.every(
        (u: unknown) =>
          typeof u === 'string' && u.startsWith('https://') && u.includes(BLOB_DOMAIN),
      );
      if (!valid) {
        return new Response(JSON.stringify({ error: 'URLs inválidas de Vercel Blob' }), {
          status: 400,
        });
      }

      await del(urls as string[], { token: getBlobToken() });
      return new Response(null, { status: 204 });
    } catch (e) {
      console.error('Delete blob error:', e);
      return new Response(JSON.stringify({ error: 'Error al eliminar imagen' }), { status: 500 });
    }
  });

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const tournamentSlug = formData.get('tournamentSlug') as string | null;
      const type = formData.get('type') as string | null;

      if (!file) {
        return new Response(JSON.stringify({ error: 'No se envió archivo' }), { status: 400 });
      }

      let path: string;
      if (tournamentSlug && type === 'gallery') {
        const slug = normalizeSlug(tournamentSlug);
        if (!slug) {
          return new Response(JSON.stringify({ error: 'tournamentSlug inválido' }), { status: 400 });
        }
        path = `tournaments/${slug}/gallery/${nanoid()}.webp`;
      } else {
        path = `uploads/${nanoid()}.webp`;
      }

      try {
        const { url } = await putPublicWebpBlob(path, file);
        return new Response(JSON.stringify({ url }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        const code = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '';
        if (code === 'INVALID_TYPE') {
          return new Response(
            JSON.stringify({
              error: 'Solo se permiten imágenes WebP optimizadas en el cliente.',
            }),
            { status: 400 },
          );
        }
        if (code === 'TOO_LARGE') {
          return new Response(
            JSON.stringify({ error: `La imagen no puede superar ${WEBP_BLOB_MAX_BYTES / 1024} KB.` }),
            { status: 400 },
          );
        }
        if (code === 'BLOB_TOKEN_MISSING') {
          return new Response(
            JSON.stringify({
              error: 'BLOB_READ_WRITE_TOKEN no configurado. Añádelo a .env y reinicia el servidor.',
            }),
            { status: 500 },
          );
        }
        throw e;
      }
    } catch (e) {
      console.error('Upload error:', e);
      return new Response(JSON.stringify({ error: 'Error al subir archivo' }), { status: 500 });
    }
  });
