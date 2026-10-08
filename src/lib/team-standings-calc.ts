import type { StandingRow } from './standings-calc';

export type TeamStandingRow = {
  teamId: string;
  name: string;
  points: number;
  buchholzCut1: number;
  playerCount: number;
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
};

export function buildTeamStandingsFromPlayerStandings(
  teamList: { id: string; name: string }[],
  playerStandings: StandingRow[],
  playersWithTeam: { id: string; teamId: string | null; status: string }[],
): TeamStandingRow[] {
  const standingByPlayer = new Map(playerStandings.map((row) => [row.playerId, row]));
  const rows: TeamStandingRow[] = teamList.map((team) => ({
    teamId: team.id,
    name: team.name,
    points: 0,
    buchholzCut1: 0,
    playerCount: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gamesPlayed: 0,
  }));
  const byTeam = new Map(rows.map((row) => [row.teamId, row]));

  for (const player of playersWithTeam) {
    if (!player.teamId || player.status === 'withdrawn') continue;
    const teamRow = byTeam.get(player.teamId);
    if (!teamRow) continue;

    teamRow.playerCount += 1;
    const standing = standingByPlayer.get(player.id);
    if (!standing) continue;

    teamRow.points += standing.points;
    teamRow.buchholzCut1 += standing.buchholzCut1;
    teamRow.wins += standing.wins;
    teamRow.draws += standing.draws;
    teamRow.losses += standing.losses;
    teamRow.gamesPlayed += standing.gamesPlayed;
  }

  return sortTeamStandings(rows);
}

export function sortTeamStandings(rows: TeamStandingRow[]): TeamStandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholzCut1 !== a.buchholzCut1) return b.buchholzCut1 - a.buchholzCut1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name, 'es');
  });
}
