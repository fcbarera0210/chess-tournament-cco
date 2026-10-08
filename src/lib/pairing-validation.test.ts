import { describe, expect, it } from 'vitest';
import { validatePairings } from './pairing-validation';

describe('pairing-validation', () => {
  const checkedIn = ['a', 'b', 'c'];

  it('requires exactly one bye for odd player count', () => {
    expect(
      validatePairings(
        [
          { whitePlayerId: 'a', blackPlayerId: 'b', isBye: false },
          { whitePlayerId: 'c', isBye: true },
        ],
        checkedIn,
      ).valid,
    ).toBe(true);

    expect(
      validatePairings([{ whitePlayerId: 'a', blackPlayerId: 'b', isBye: false }], checkedIn).valid,
    ).toBe(false);
  });

  it('rejects duplicate assignments', () => {
    const result = validatePairings(
      [
        { whitePlayerId: 'a', blackPlayerId: 'b', isBye: false },
        { whitePlayerId: 'a', blackPlayerId: 'c', isBye: false },
      ],
      checkedIn,
    );

    expect(result.valid).toBe(false);
  });

  it('rejects same-team pairings when team map is provided', () => {
    const result = validatePairings(
      [
        { whitePlayerId: 'a', blackPlayerId: 'b', isBye: false },
        { whitePlayerId: 'c', isBye: true },
      ],
      checkedIn,
      {
        teamByPlayerId: new Map([
          ['a', 'alpha'],
          ['b', 'alpha'],
          ['c', 'beta'],
        ]),
      },
    );

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/mismo equipo/i);
  });
});
