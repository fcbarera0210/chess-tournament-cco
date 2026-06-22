export function adminApiUrl(path: string, tournamentId: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}tournamentId=${encodeURIComponent(tournamentId)}`;
}

export function publicApiUrl(path: string, slug: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}slug=${encodeURIComponent(slug)}`;
}
