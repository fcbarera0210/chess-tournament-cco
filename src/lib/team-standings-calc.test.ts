import { describe, expect, it } from 'vitest';
import { buildTeamStandingsFromPlayerStandings } from './team-standings-calc';
import type { StandingRow } from './standings-calc';

function standing(partial: Partial<StandingRow> & Pick<StandingRow, 'playerId' | 'name'>): StandingRow {
  return {
    points: 0,
    gamesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    buchholzCut1: 0,
    ...partial,
  };
}

describe('buildTeamStandingsFromPlayerStandings', () => {
  it('suma puntos de jugadores por equipo estilo Olympiad', () => {
    const rows = buildTeamStandingsFromPlayerStandings(
      [
        { id: 't1', name: 'Alpha' },
        { id: 't2', name: 'Beta' },
      ],
      [
        standing({ playerId: 'p1', name: 'Ana', points: 2, buchholzCut1: 1, wins: 2 }),
        standing({ playerId: 'p2', name: 'Bruno', points: 1, buchholzCut1: 2, wins: 1 }),
        standing({ playerId: 'p3', name: 'Carla', points: 1.5, buchholzCut1: 0.5, wins: 1, draws: 1 }),
      ],
      [
        { id: 'p1', teamId: 't1', status: 'checked_in' },
        { id: 'p2', teamId: 't1', status: 'checked_in' },
        { id: 'p3', teamId: 't2', status: 'checked_in' },
      ],
    );

    expect(rows[0].teamId).toBe('t1');
    expect(rows[0].points).toBe(3);
    expect(rows[0].buchholzCut1).toBe(3);
    expect(rows[0].playerCount).toBe(2);
    expect(rows[1].teamId).toBe('t2');
    expect(rows[1].points).toBe(1.5);
  });

  it('ignora jugadores retirados', () => {
    const rows = buildTeamStandingsFromPlayerStandings(
      [{ id: 't1', name: 'Alpha' }],
      [standing({ playerId: 'p1', name: 'Ana', points: 3 })],
      [{ id: 'p1', teamId: 't1', status: 'withdrawn' }],
    );

    expect(rows[0].points).toBe(0);
    expect(rows[0].playerCount).toBe(0);
  });
});
