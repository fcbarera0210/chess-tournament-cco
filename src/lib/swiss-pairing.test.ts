import { describe, expect, it } from 'vitest';
import { generateSwissPairings, type PairingPlayer } from './swiss-pairing';

function player(
  id: string,
  overrides: Partial<PairingPlayer> = {},
): PairingPlayer {
  return {
    id,
    name: id,
    points: 0,
    hadBye: false,
    createdAt: new Date(`2026-01-${id.padStart(2, '0')}T12:00:00Z`),
    opponentIds: new Set<string>(),
    whiteGames: 0,
    blackGames: 0,
    ...overrides,
  };
}

describe('swiss-pairing', () => {
  it('assigns bye to lowest score without previous bye when odd', () => {
    const players = [
      player('1', { points: 2 }),
      player('2', { points: 1 }),
      player('3', { points: 0 }),
    ];

    const result = generateSwissPairings(players, 2, () => 0.5);

    expect(result.byePlayerId).toBe('3');
    expect(result.pairings.filter((p) => p.isBye)).toHaveLength(1);
    expect(result.pairings.filter((p) => !p.isBye)).toHaveLength(1);
  });

  it('pairs all players in round one', () => {
    const players = [player('1'), player('2'), player('3'), player('4')];
    const result = generateSwissPairings(players, 1, () => 0.42);

    const paired = new Set<string>();
    for (const pairing of result.pairings) {
      paired.add(pairing.whitePlayerId);
      if (pairing.blackPlayerId) paired.add(pairing.blackPlayerId);
    }

    expect(paired.size).toBe(4);
    expect(result.byePlayerId).toBeNull();
  });

  it('avoids rematch when possible in later rounds', () => {
    const players = [
      player('1', { points: 2, opponentIds: new Set(['2']) }),
      player('2', { points: 2, opponentIds: new Set(['1']) }),
      player('3', { points: 0, opponentIds: new Set(['4']) }),
      player('4', { points: 0, opponentIds: new Set(['3']) }),
    ];

    const result = generateSwissPairings(players, 2, () => 0.1);
    const boards = result.pairings
      .filter((p) => !p.isBye)
      .map((p) => [p.whitePlayerId, p.blackPlayerId].sort().join('-'));

    expect(boards).toContain('1-3');
    expect(boards).toContain('2-4');
  });

  it('never pairs teammates against each other', () => {
    const players = [
      player('1', { teamId: 'alpha' }),
      player('2', { teamId: 'alpha' }),
      player('3', { teamId: 'beta' }),
      player('4', { teamId: 'beta' }),
    ];

    const result = generateSwissPairings(players, 1, () => 0.33);
    const boards = result.pairings.filter((p) => !p.isBye);

    expect(boards).toHaveLength(2);
    for (const board of boards) {
      const ids = [board.whitePlayerId, board.blackPlayerId!].sort();
      expect(ids.join('-')).not.toBe('1-2');
      expect(ids.join('-')).not.toBe('3-4');
    }
  });

  it('avoids teammate rematch preference in later rounds', () => {
    const players = [
      player('1', { points: 1, teamId: 'alpha', opponentIds: new Set(['3']) }),
      player('2', { points: 1, teamId: 'alpha', opponentIds: new Set(['4']) }),
      player('3', { points: 1, teamId: 'beta', opponentIds: new Set(['1']) }),
      player('4', { points: 1, teamId: 'beta', opponentIds: new Set(['2']) }),
    ];

    const result = generateSwissPairings(players, 2, () => 0.2);
    const boards = result.pairings
      .filter((p) => !p.isBye)
      .map((p) => [p.whitePlayerId, p.blackPlayerId].sort().join('-'));

    expect(boards).toContain('1-4');
    expect(boards).toContain('2-3');
  });
});
