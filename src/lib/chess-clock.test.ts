import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  formatTimeControl,
  initialTimeMs,
  parseTimeControl,
  shouldShowTenths,
  switchTurn,
  tickClock,
} from './chess-clock';

describe('chess-clock', () => {
  it('parses valid time controls', () => {
    expect(parseTimeControl('10+5')).toEqual({ minutes: 10, incrementSeconds: 5 });
    expect(parseTimeControl(' 3+2 ')).toEqual({ minutes: 3, incrementSeconds: 2 });
  });

  it('rejects invalid time controls', () => {
    expect(parseTimeControl('abc')).toBeNull();
    expect(parseTimeControl('0+0')).toBeNull();
    expect(parseTimeControl('200+0')).toBeNull();
  });

  it('formats clock display', () => {
    expect(formatClockTime(10 * 60_000)).toBe('10:00');
    expect(formatClockTime(65_000)).toBe('1:05');
    expect(formatClockTime(4_500, true)).toBe('4.5');
  });

  it('shows tenths only under 20 seconds', () => {
    expect(shouldShowTenths(19_999)).toBe(true);
    expect(shouldShowTenths(20_000)).toBe(false);
  });

  it('ticks down active player time', () => {
    const snapshot = {
      whiteMs: 60_000,
      blackMs: 60_000,
      active: 'white' as const,
      running: true,
    };

    const next = tickClock(snapshot, 5_000, 0);
    expect(next.whiteMs).toBe(55_000);
    expect(next.blackMs).toBe(60_000);
    expect(next.running).toBe(true);
  });

  it('stops when time runs out', () => {
    const snapshot = {
      whiteMs: 1_000,
      blackMs: 60_000,
      active: 'white' as const,
      running: true,
    };

    const next = tickClock(snapshot, 2_000, 0);
    expect(next.whiteMs).toBe(0);
    expect(next.running).toBe(false);
  });

  it('adds increment on switch', () => {
    const snapshot = {
      whiteMs: 30_000,
      blackMs: 60_000,
      active: 'white' as const,
      running: true,
    };

    const { snapshot: next, finished } = switchTurn(snapshot, 5_000);
    expect(finished).toBeNull();
    expect(next.whiteMs).toBe(35_000);
    expect(next.active).toBe('black');
  });

  it('formats and initializes time control', () => {
    const control = { minutes: 10, incrementSeconds: 5 };
    expect(formatTimeControl(control)).toBe('10+5');
    expect(initialTimeMs(control)).toBe(600_000);
  });
});
