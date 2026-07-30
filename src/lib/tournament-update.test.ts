import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/test';

const { buildTournamentUpdates } = await import('./tournament-update');
import type { tournaments } from './db/schema';

type TournamentRow = typeof tournaments.$inferSelect;

function baseTournament(overrides: Partial<TournamentRow> = {}): TournamentRow {
  return {
    id: 't1',
    name: 'Torneo',
    slug: 'torneo',
    eventDate: '2026-01-01',
    eventTimeStart: '10:00',
    eventTimeEnd: '18:00',
    venue: 'Curicó',
    venueMapsUrl: null,
    format: 'swiss',
    maxPlayers: 32,
    plannedRounds: 5,
    timeControl: '15+10',
    status: 'live',
    waitlistEnabled: false,
    showOnHome: true,
    publicRegistration: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('buildTournamentUpdates', () => {
  beforeAll(() => {
    process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/test';
  });

  it('al finalizar apaga la inscripción pública', () => {
    const { updates, error } = buildTournamentUpdates(
      { status: 'finished' },
      baseTournament({ publicRegistration: true }),
    );

    expect(error).toBeUndefined();
    expect(updates.status).toBe('finished');
    expect(updates.publicRegistration).toBe(false);
  });

  it('rechaza inscripción pública sin showOnHome', () => {
    const { error } = buildTournamentUpdates(
      { publicRegistration: true, showOnHome: false },
      baseTournament({ publicRegistration: false, showOnHome: true }),
    );

    expect(error).toMatch(/inscripción pública/i);
  });
});
