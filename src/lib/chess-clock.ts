export type TimeControl = {
  minutes: number;
  incrementSeconds: number;
};

export type ClockPlayer = 'white' | 'black';
export type PanelSide = 'top' | 'bottom';

export type SideAssignment = {
  top: ClockPlayer | null;
  bottom: ClockPlayer | null;
};

export const CLOCK_PRESETS: Array<{ label: string; control: TimeControl }> = [
  { label: '1+0', control: { minutes: 1, incrementSeconds: 0 } },
  { label: '3+2', control: { minutes: 3, incrementSeconds: 2 } },
  { label: '5+3', control: { minutes: 5, incrementSeconds: 3 } },
  { label: '5+5', control: { minutes: 5, incrementSeconds: 5 } },
  { label: '10+0', control: { minutes: 10, incrementSeconds: 0 } },
  { label: '10+3', control: { minutes: 10, incrementSeconds: 3 } },
  { label: '10+5', control: { minutes: 10, incrementSeconds: 5 } },
  { label: '15+10', control: { minutes: 15, incrementSeconds: 10 } },
  { label: '30+0', control: { minutes: 30, incrementSeconds: 0 } },
];

export const CLOCK_STORAGE_KEY = 'chess-clock:last-control';

export function parseTimeControl(label: string): TimeControl | null {
  const match = label.trim().match(/^(\d+)\+(\d+)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const incrementSeconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(incrementSeconds)) return null;
  if (minutes < 0 || incrementSeconds < 0 || minutes > 180 || incrementSeconds > 60) return null;
  if (minutes === 0 && incrementSeconds === 0) return null;
  return { minutes, incrementSeconds };
}

export function formatTimeControl(control: TimeControl): string {
  return `${control.minutes}+${control.incrementSeconds}`;
}

export function initialTimeMs(control: TimeControl): number {
  return control.minutes * 60_000;
}

export function formatClockTime(ms: number, showTenths = false): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = clamped / 1000;

  if (showTenths && totalSeconds < 20) {
    const tenths = Math.floor(clamped / 100) / 10;
    return tenths.toFixed(1);
  }

  const totalWholeSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalWholeSeconds / 60);
  const seconds = totalWholeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function shouldShowTenths(ms: number): boolean {
  return ms > 0 && ms < 20_000;
}

export function loadSavedTimeControl(): TimeControl {
  if (typeof localStorage === 'undefined') return CLOCK_PRESETS[6].control;

  try {
    const raw = localStorage.getItem(CLOCK_STORAGE_KEY);
    if (!raw) return CLOCK_PRESETS[6].control;
    const parsed = parseTimeControl(raw);
    return parsed ?? CLOCK_PRESETS[6].control;
  } catch {
    return CLOCK_PRESETS[6].control;
  }
}

export function saveTimeControl(control: TimeControl): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLOCK_STORAGE_KEY, formatTimeControl(control));
  } catch {
    // ignore quota / private mode
  }
}

export type ClockSnapshot = {
  whiteMs: number;
  blackMs: number;
  active: ClockPlayer | null;
  running: boolean;
  sides: SideAssignment;
};

export function assignSidesFromFirstTap(side: PanelSide): SideAssignment {
  return side === 'top'
    ? { top: 'white', bottom: 'black' }
    : { top: 'black', bottom: 'white' };
}

export function tickClock(snapshot: ClockSnapshot, now: number, lastTick: number): ClockSnapshot {
  if (!snapshot.running || snapshot.active === null) return snapshot;

  const elapsed = now - lastTick;
  if (elapsed <= 0) return snapshot;

  if (snapshot.active === 'white') {
    const whiteMs = Math.max(0, snapshot.whiteMs - elapsed);
    return { ...snapshot, whiteMs, running: whiteMs > 0 };
  }

  const blackMs = Math.max(0, snapshot.blackMs - elapsed);
  return { ...snapshot, blackMs, running: blackMs > 0 };
}

export function switchTurn(
  snapshot: ClockSnapshot,
  incrementMs: number,
): { snapshot: ClockSnapshot; finished: ClockPlayer | null } {
  if (!snapshot.running || snapshot.active === null) {
    return { snapshot, finished: null };
  }

  if (snapshot.active === 'white') {
    if (snapshot.whiteMs <= 0) {
      return { snapshot: { ...snapshot, running: false }, finished: 'white' };
    }
    return {
      snapshot: {
        ...snapshot,
        whiteMs: snapshot.whiteMs + incrementMs,
        active: 'black',
        running: true,
      },
      finished: null,
    };
  }

  if (snapshot.blackMs <= 0) {
    return { snapshot: { ...snapshot, running: false }, finished: 'black' };
  }

  return {
    snapshot: {
      ...snapshot,
      blackMs: snapshot.blackMs + incrementMs,
      active: 'white',
      running: true,
    },
    finished: null,
  };
}
