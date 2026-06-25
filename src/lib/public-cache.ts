import type { APIContext } from 'astro';

export type PublicCacheProfile = 'home' | 'bases' | 'registration' | 'archive';

const PROFILES: Record<
  PublicCacheProfile,
  { maxAge: number; swr: number; tags: string[] }
> = {
  home: { maxAge: 60, swr: 120, tags: ['public', 'home'] },
  bases: { maxAge: 60, swr: 120, tags: ['public', 'bases'] },
  registration: { maxAge: 60, swr: 120, tags: ['public', 'registration'] },
  archive: { maxAge: 300, swr: 600, tags: ['public', 'archive'] },
};

function buildTags(profile: PublicCacheProfile, slug?: string): string[] {
  const tags = [...PROFILES[profile].tags];
  if (slug) tags.push(`tournament:${slug}`);
  return tags;
}

function applyCdnHeaders(headers: Headers, maxAge: number, swr: number) {
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  const directive = `max-age=${maxAge}, stale-while-revalidate=${swr}`;
  headers.set('Vercel-CDN-Cache-Control', directive);
  headers.set('CDN-Cache-Control', directive);
}

type CacheContext = Pick<APIContext, 'cache' | 'response'>;

export function applyPublicPageCache(
  context: CacheContext,
  profile: PublicCacheProfile,
  slug?: string,
) {
  const { maxAge, swr } = PROFILES[profile];
  const tags = buildTags(profile, slug);

  context.cache.set({ maxAge, swr, tags });
  applyCdnHeaders(context.response.headers, maxAge, swr);
}

export function publicApiCacheHeaders(profile: PublicCacheProfile = 'registration'): HeadersInit {
  const { maxAge, swr } = PROFILES[profile];
  const directive = `max-age=${maxAge}, stale-while-revalidate=${swr}`;
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Vercel-CDN-Cache-Control': directive,
    'CDN-Cache-Control': directive,
  };
}
