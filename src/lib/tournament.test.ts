import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();

vi.mock('./db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

import { getRegistrationStats, getRegistrationStatsBatch } from './tournament';

function chainSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => void) => resolve(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

describe('getRegistrationStats', () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it('returns aggregated counts from a single query row', async () => {
    mockSelect.mockReturnValue(
      chainSelect([{ registered: 12, waitlist: 3, checkedIn: 5 }]),
    );

    const stats = await getRegistrationStats('tournament-1');

    expect(stats).toEqual({ registered: 12, waitlist: 3, checkedIn: 5 });
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('returns zeros when no players exist', async () => {
    mockSelect.mockReturnValue(chainSelect([]));

    const stats = await getRegistrationStats('tournament-1');

    expect(stats).toEqual({ registered: 0, waitlist: 0, checkedIn: 0 });
  });
});

describe('getRegistrationStatsBatch', () => {
  beforeEach(() => {
    mockSelect.mockReset();
  });

  it('returns empty map for no ids', async () => {
    const stats = await getRegistrationStatsBatch([]);
    expect(stats.size).toBe(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('maps stats per tournament id', async () => {
    mockSelect.mockReturnValue(
      chainSelect([
        { tournamentId: 'a', registered: 10, waitlist: 1, checkedIn: 2 },
        { tournamentId: 'b', registered: 5, waitlist: 0, checkedIn: 0 },
      ]),
    );

    const stats = await getRegistrationStatsBatch(['a', 'b', 'c']);

    expect(stats.get('a')).toEqual({ registered: 10, waitlist: 1, checkedIn: 2 });
    expect(stats.get('b')).toEqual({ registered: 5, waitlist: 0, checkedIn: 0 });
    expect(stats.get('c')).toEqual({ registered: 0, waitlist: 0, checkedIn: 0 });
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });
});

describe('isRegistrationOpen', () => {
  const tournament = {
    status: 'registration_open' as const,
    maxPlayers: 20,
    publicRegistration: true,
  };

  it('opens registration when below capacity', async () => {
    const { isRegistrationOpen } = await import('./tournament');
    expect(isRegistrationOpen(tournament, 10)).toBe(true);
  });

  it('closes registration at capacity', async () => {
    const { isRegistrationOpen } = await import('./tournament');
    expect(isRegistrationOpen(tournament, 20)).toBe(false);
  });
});
