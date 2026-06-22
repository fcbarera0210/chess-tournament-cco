export function slugifyTournamentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!baseSlug) return 'torneo';
  if (!(await exists(baseSlug))) return baseSlug;

  for (let i = 2; i < 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${baseSlug}-${Date.now()}`;
}
