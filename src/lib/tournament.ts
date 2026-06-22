import { eq, and, inArray, sql, asc } from 'drizzle-orm';
import { db } from './db';
import { tournaments, players, rounds, games } from './db/schema';

export function getTournamentSlug(): string {
  const fromMeta =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.PUBLIC_TOURNAMENT_SLUG
      : undefined;
  return fromMeta ?? process.env.PUBLIC_TOURNAMENT_SLUG ?? 'curico-2026';
}

export async function getActiveTournament() {
  const slug = getTournamentSlug();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);
  return tournament ?? null;
}

export async function getRegistrationStats(tournamentId: string) {
  const registered = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(
      and(
        eq(players.tournamentId, tournamentId),
        inArray(players.status, ['registered', 'checked_in']),
      ),
    );

  const waitlist = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.tournamentId, tournamentId), eq(players.status, 'waitlist')));

  const checkedIn = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.tournamentId, tournamentId), eq(players.status, 'checked_in')));

  return {
    registered: registered[0]?.count ?? 0,
    waitlist: waitlist[0]?.count ?? 0,
    checkedIn: checkedIn[0]?.count ?? 0,
  };
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
  return tournament.status === 'draft' || tournament.status === 'registration_open' || tournament.status === 'registration_closed';
}

export function isRegistrationOpen(tournament: { status: string; maxPlayers: number }, registeredCount: number) {
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
