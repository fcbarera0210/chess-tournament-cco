import { eq, and, inArray, sql, asc, desc, ne } from 'drizzle-orm';
import { db } from './db';
import { tournaments, players, rounds, games } from './db/schema';

const FEATURED_STATUSES = ['registration_open', 'registration_closed', 'live'] as const;

export async function getTournamentBySlug(slug: string) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);
  return tournament ?? null;
}

export async function getTournamentById(id: string) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  return tournament ?? null;
}

export async function listAdminTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
}

export async function getFeaturedTournament() {
  const candidates = await db
    .select()
    .from(tournaments)
    .where(
      and(
        eq(tournaments.showOnHome, true),
        inArray(tournaments.status, [...FEATURED_STATUSES]),
      ),
    )
    .orderBy(desc(tournaments.eventDate));

  if (candidates.length === 0) return null;

  const open = candidates.find((t) => t.status === 'registration_open');
  if (open) return open;

  const live = candidates.find((t) => t.status === 'live');
  if (live) return live;

  return candidates[0] ?? null;
}

export async function getPublicArchiveTournaments() {
  return db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.showOnHome, true), eq(tournaments.status, 'finished')))
    .orderBy(desc(tournaments.eventDate));
}

/** Archivo principal del home cuando no hay torneo activo destacado */
export async function getPrimaryHomeArchive() {
  const archives = await getPublicArchiveTournaments();
  if (archives[0]) return archives[0];

  const [fallback] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, 'finished'))
    .orderBy(desc(tournaments.eventDate))
    .limit(1);
  return fallback ?? null;
}

export async function slugExists(slug: string, excludeId?: string) {
  const conditions = [eq(tournaments.slug, slug)];
  if (excludeId) conditions.push(ne(tournaments.id, excludeId));

  const [row] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(and(...conditions))
    .limit(1);
  return !!row;
}

export type RegistrationStats = {
  registered: number;
  waitlist: number;
  checkedIn: number;
};

const EMPTY_REGISTRATION_STATS: RegistrationStats = {
  registered: 0,
  waitlist: 0,
  checkedIn: 0,
};

function mapRegistrationStatsRow(row: {
  registered: number | null;
  waitlist: number | null;
  checkedIn: number | null;
}): RegistrationStats {
  return {
    registered: row.registered ?? 0,
    waitlist: row.waitlist ?? 0,
    checkedIn: row.checkedIn ?? 0,
  };
}

export async function getRegistrationStats(tournamentId: string): Promise<RegistrationStats> {
  const [row] = await db
    .select({
      registered: sql<number>`count(*) filter (where ${players.status} in ('registered', 'checked_in'))::int`,
      waitlist: sql<number>`count(*) filter (where ${players.status} = 'waitlist')::int`,
      checkedIn: sql<number>`count(*) filter (where ${players.status} = 'checked_in')::int`,
    })
    .from(players)
    .where(eq(players.tournamentId, tournamentId));

  return row ? mapRegistrationStatsRow(row) : EMPTY_REGISTRATION_STATS;
}

export async function getRegistrationStatsBatch(
  tournamentIds: string[],
): Promise<Map<string, RegistrationStats>> {
  const uniqueIds = [...new Set(tournamentIds)];
  const result = new Map<string, RegistrationStats>();

  if (uniqueIds.length === 0) return result;

  const rows = await db
    .select({
      tournamentId: players.tournamentId,
      registered: sql<number>`count(*) filter (where ${players.status} in ('registered', 'checked_in'))::int`,
      waitlist: sql<number>`count(*) filter (where ${players.status} = 'waitlist')::int`,
      checkedIn: sql<number>`count(*) filter (where ${players.status} = 'checked_in')::int`,
    })
    .from(players)
    .where(inArray(players.tournamentId, uniqueIds))
    .groupBy(players.tournamentId);

  for (const id of uniqueIds) {
    result.set(id, EMPTY_REGISTRATION_STATS);
  }
  for (const row of rows) {
    result.set(row.tournamentId, mapRegistrationStatsRow(row));
  }

  return result;
}

export async function getActiveRound(tournamentId: string) {
  const [round] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.tournamentId, tournamentId), eq(rounds.status, 'active')))
    .limit(1);
  return round ?? null;
}

export async function getGamesForRound(roundId: string) {
  const rows = await db.query.games.findMany({
    where: eq(games.roundId, roundId),
    with: {
      whitePlayer: true,
      blackPlayer: true,
    },
    orderBy: asc(games.boardNumber),
  });

  return rows.map((g) => ({
    id: g.id,
    boardNumber: g.boardNumber,
    result: g.result,
    isBye: g.isBye,
    whitePlayerId: g.whitePlayerId,
    blackPlayerId: g.blackPlayerId,
    whiteName: g.whitePlayer?.name ?? null,
    blackName: g.blackPlayer?.name ?? null,
  }));
}

export function isTournamentLocked(tournament: { status: string }) {
  return tournament.status === 'finished';
}

export function canEditFormat(tournament: { status: string }) {
  return (
    tournament.status === 'draft' ||
    tournament.status === 'registration_open' ||
    tournament.status === 'registration_closed'
  );
}

export function isRegistrationOpen(
  tournament: { status: string; maxPlayers: number; publicRegistration: boolean },
  registeredCount: number,
) {
  if (!tournament.publicRegistration) return false;
  if (tournament.status !== 'registration_open') return false;
  return registeredCount < tournament.maxPlayers;
}

export async function resetTournamentData(
  tournamentId: string,
  mode: 'rounds' | 'full',
  currentStatus: string,
) {
  await db.delete(rounds).where(eq(rounds.tournamentId, tournamentId));

  let newStatus: (typeof tournaments.$inferSelect)['status'] | undefined;

  if (mode === 'full') {
    await db.delete(players).where(eq(players.tournamentId, tournamentId));
    newStatus = 'registration_open';
  } else if (currentStatus === 'live' || currentStatus === 'finished') {
    newStatus = 'registration_closed';
  }

  if (newStatus) {
    await db
      .update(tournaments)
      .set({ status: newStatus })
      .where(eq(tournaments.id, tournamentId));
  }
}
