import type { APIContext } from 'astro';

export async function invalidatePublicTournamentCache(
  cache: APIContext['cache'],
  slug?: string,
) {
  await cache.invalidate({
    tags: ['public', 'home', 'bases', 'registration', 'archive', ...(slug ? [`tournament:${slug}`] : [])],
  });
}
