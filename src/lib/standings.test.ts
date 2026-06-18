import { describe, expect, it } from 'vitest';
import {
  applyGameToStanding,
  buildStandingsFromGames,
  computeBuchholzCut1,
  pointsForResult,
} from './standings-calc';

describe('standings', () => {
  it('awards exactly one point for a bye', () => {
    const row = {
      playerId: 'p1',
      name: 'Ana',
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholzCut1: 0,
    };

    applyGameToStanding(
      row,
      { result: 'bye', isBye: true, whitePlayerId: 'p1', blackPlayerId: null },
      'p1',
    );

    expect(row.points).toBe(1);
    expect(row.wins).toBe(1);
    expect(row.gamesPlayed).toBe(0);
  });

  it('computes Buchholz Cut 1 from opponent points', () => {
    const pointsByPlayer = new Map([
      ['a', 3],
      ['b', 2],
      ['c', 1],
    ]);

    expect(computeBuchholzCut1(['b', 'c'], pointsByPlayer)).toBe(2);
    expect(computeBuchholzCut1([], pointsByPlayer)).toBe(0);
  });

  it('sorts by points then Buchholz Cut 1', () => {
    const standings = buildStandingsFromGames(
      [
        { id: 'a', name: 'Ana', status: 'checked_in' },
        { id: 'b', name: 'Bruno', status: 'checked_in' },
        { id: 'c', name: 'Carla', status: 'checked_in' },
      ],
      [
        {
          result: 'white',
          isBye: false,
          whitePlayerId: 'a',
          blackPlayerId: 'b',
        },
        {
          result: 'white',
          isBye: false,
          whitePlayerId: 'a',
          blackPlayerId: 'c',
        },
        {
          result: 'black',
          isBye: false,
          whitePlayerId: 'c',
          blackPlayerId: 'b',
        },
      ],
    );

    expect(standings[0].playerId).toBe('a');
    expect(standings[0].points).toBe(2);
    expect(standings.find((s) => s.playerId === 'b')?.buchholzCut1).toBeGreaterThan(0);
  });

  it('counts draw as half point', () => {
    expect(pointsForResult('draw', 'p1', 'p1', 'p2')).toBe(0.5);
  });
});
