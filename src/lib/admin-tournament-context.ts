import { desc } from 'drizzle-orm';
import { db } from './db';
import { tournaments } from './db/schema';
import { getTournamentById } from './tournament';

export const ADMIN_TOURNAMENT_COOKIE = 'admin_tournament_id';

export function getAdminTournamentIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('tournamentId');
  if (fromQuery) return fromQuery;

  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`${ADMIN_TOURNAMENT_COOKIE}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

export async function resolveAdminTournamentId(request: Request): Promise<string | null> {
  const explicit = getAdminTournamentIdFromRequest(request);
  if (explicit) {
    const tournament = await getTournamentById(explicit);
    if (tournament) return tournament.id;
  }

  const [latest] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .orderBy(desc(tournaments.createdAt))
    .limit(1);

  return latest?.id ?? null;
}

export async function requireAdminTournament(request: Request) {
  const id = await resolveAdminTournamentId(request);
  if (!id) return null;
  return getTournamentById(id);
}

export function adminTournamentCookieHeader(tournamentId: string): string {
  return `${ADMIN_TOURNAMENT_COOKIE}=${tournamentId}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function getSlugFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('slug');
}
