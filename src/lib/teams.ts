import { and, asc, count, eq } from 'drizzle-orm';
import { db } from './db';
import { players, teams } from './db/schema';
import { MIN_TEAMS_FOR_TEAM_TOURNAMENT } from './team-constants';

export { MIN_TEAMS_FOR_TEAM_TOURNAMENT } from './team-constants';

export async function listTeamsByTournament(tournamentId: string) {
  return db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId))
    .orderBy(asc(teams.name));
}

export async function countTeamsByTournament(tournamentId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
  return row?.value ?? 0;
}

export async function getTeamInTournament(teamId: string, tournamentId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId)))
    .limit(1);
  return team ?? null;
}

export async function findTeamByName(tournamentId: string, name: string, excludeId?: string) {
  const list = await listTeamsByTournament(tournamentId);
  const normalized = name.trim().toLocaleLowerCase('es');
  return (
    list.find(
      (team) =>
        team.name.trim().toLocaleLowerCase('es') === normalized &&
        (!excludeId || team.id !== excludeId),
    ) ?? null
  );
}

export function validateTeamTournamentReady(teamCount: number): string | null {
  if (teamCount < MIN_TEAMS_FOR_TEAM_TOURNAMENT) {
    return `Un torneo por equipos necesita al menos ${MIN_TEAMS_FOR_TEAM_TOURNAMENT} equipos`;
  }
  return null;
}

export async function clearPlayerTeams(tournamentId: string) {
  await db.update(players).set({ teamId: null }).where(eq(players.tournamentId, tournamentId));
}

export async function deleteTeamsForTournament(tournamentId: string) {
  await clearPlayerTeams(tournamentId);
  await db.delete(teams).where(eq(teams.tournamentId, tournamentId));
}
