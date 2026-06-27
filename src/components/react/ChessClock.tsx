import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLOCK_PRESETS,
  formatClockTime,
  formatTimeControl,
  initialTimeMs,
  loadSavedTimeControl,
  parseTimeControl,
  saveTimeControl,
  shouldShowTenths,
  switchTurn,
  tickClock,
  assignSidesFromFirstTap,
  type ClockPlayer,
  type ClockSnapshot,
  type PanelSide,
  type SideAssignment,
  type TimeControl,
} from '../../lib/chess-clock';

type Phase = 'setup' | 'playing' | 'paused' | 'finished';

type TimeEditState = {
  active: boolean;
  target: ClockPlayer | null;
  showCustomForm: boolean;
};

const EMPTY_SIDES: SideAssignment = { top: null, bottom: null };

function createInitialSnapshot(control: TimeControl): ClockSnapshot {
  const startMs = initialTimeMs(control);
  return {
    whiteMs: startMs,
    blackMs: startMs,
    active: null,
    running: false,
    sides: { ...EMPTY_SIDES },
  };
}

const EMPTY_TIME_EDIT: TimeEditState = { active: false, target: null, showCustomForm: false };

function controlsMatch(a: TimeControl, b: TimeControl): boolean {
  return a.minutes === b.minutes && a.incrementSeconds === b.incrementSeconds;
}

export function ChessClock() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [control, setControl] = useState<TimeControl>(() => loadSavedTimeControl());
  const [customMinutes, setCustomMinutes] = useState(String(control.minutes));
  const [customIncrement, setCustomIncrement] = useState(String(control.incrementSeconds));
  const [customError, setCustomError] = useState<string | null>(null);
  const [active, setActive] = useState<ClockPlayer | null>(null);
  const [sides, setSides] = useState<SideAssignment>(EMPTY_SIDES);
  const [whiteMs, setWhiteMs] = useState(() => initialTimeMs(control));
  const [blackMs, setBlackMs] = useState(() => initialTimeMs(control));
  const [winner, setWinner] = useState<ClockPlayer | null>(null);
  const [lowTimePulse, setLowTimePulse] = useState(false);
  const [timeEdit, setTimeEdit] = useState<TimeEditState>(EMPTY_TIME_EDIT);
  const [customEditMinutes, setCustomEditMinutes] = useState('0');
  const [customEditSeconds, setCustomEditSeconds] = useState('0');

  const snapshotRef = useRef<ClockSnapshot>(createInitialSnapshot(control));
  const lastTickRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const syncFromSnapshot = useCallback((snapshot: ClockSnapshot) => {
    snapshotRef.current = snapshot;
    setWhiteMs(snapshot.whiteMs);
    setBlackMs(snapshot.blackMs);
    setActive(snapshot.active);
    setSides(snapshot.sides);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const finishGame = useCallback(
    (loser: ClockPlayer) => {
      stopLoop();
      const snapshot = { ...snapshotRef.current, running: false };
      syncFromSnapshot(snapshot);
      setWinner(loser === 'white' ? 'black' : 'white');
      setPhase('finished');
    },
    [stopLoop, syncFromSnapshot],
  );

  const startLoop = useCallback(() => {
    stopLoop();

    const loop = (now: number) => {
      if (lastTickRef.current === 0) {
        lastTickRef.current = now;
      }

      const next = tickClock(snapshotRef.current, now, lastTickRef.current);
      lastTickRef.current = now;

      if (next.whiteMs !== snapshotRef.current.whiteMs || next.blackMs !== snapshotRef.current.blackMs) {
        syncFromSnapshot(next);
      }

      if (!next.running) {
        if (next.active) {
          finishGame(next.active);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [finishGame, stopLoop, syncFromSnapshot]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  useEffect(() => {
    if (phase !== 'playing') return;

    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // unsupported or denied
      }
    }

    void requestWakeLock();

    return () => {
      void wakeLock?.release();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' || active === null) {
      setLowTimePulse(false);
      return;
    }

    const activeMs = active === 'white' ? whiteMs : blackMs;
    if (activeMs >= 10_000) {
      setLowTimePulse(false);
      return;
    }

    const interval = setInterval(() => {
      setLowTimePulse((value) => !value);
    }, 500);

    return () => clearInterval(interval);
  }, [phase, active, whiteMs, blackMs]);

  function selectPreset(next: TimeControl) {
    setControl(next);
    setCustomMinutes(String(next.minutes));
    setCustomIncrement(String(next.incrementSeconds));
    setCustomError(null);
    saveTimeControl(next);
  }

  function applyCustomControl() {
    const parsed = parseTimeControl(`${customMinutes}+${customIncrement}`);
    if (!parsed) {
      setCustomError('Usa minutos e incremento válidos (ej. 10+5).');
      return;
    }
    setCustomError(null);
    selectPreset(parsed);
  }

  function startGame() {
    const snapshot = createInitialSnapshot(control);
    syncFromSnapshot(snapshot);
    setWinner(null);
    setPhase('playing');
  }

  function handlePanelTap(panel: PanelSide) {
    if (phase !== 'playing') return;

    const snapshot = snapshotRef.current;

    if (snapshot.sides.top === null) {
      const sides = assignSidesFromFirstTap(panel);
      const nextSnapshot: ClockSnapshot = {
        ...snapshot,
        sides,
        active: 'white',
        running: true,
      };
      syncFromSnapshot(nextSnapshot);
      startLoop();
      return;
    }

    const panelPlayer = snapshot.sides[panel];
    if (panelPlayer !== snapshot.active) return;

    const incrementMs = control.incrementSeconds * 1000;
    const { snapshot: next, finished } = switchTurn(snapshot, incrementMs);

    if (finished) {
      finishGame(finished);
      return;
    }

    syncFromSnapshot(next);
    lastTickRef.current = performance.now();
  }

  function pauseGame() {
    if (phase !== 'playing') return;
    stopLoop();
    snapshotRef.current = { ...snapshotRef.current, running: false };
    setTimeEdit(EMPTY_TIME_EDIT);
    setPhase('paused');
  }

  function resumeGame() {
    if (phase !== 'paused') return;
    setTimeEdit(EMPTY_TIME_EDIT);
    const snapshot = snapshotRef.current;
    if (snapshot.active !== null) {
      snapshotRef.current = { ...snapshot, running: true };
      setPhase('playing');
      startLoop();
      return;
    }
    setPhase('playing');
  }

  function resetToSetup() {
    stopLoop();
    const saved = loadSavedTimeControl();
    setControl(saved);
    setCustomMinutes(String(saved.minutes));
    setCustomIncrement(String(saved.incrementSeconds));
    setWinner(null);
    setTimeEdit(EMPTY_TIME_EDIT);
    setPhase('setup');
  }

  function startTimeEdit() {
    setTimeEdit({ active: true, target: null, showCustomForm: false });
  }

  function finishTimeEdit() {
    setTimeEdit(EMPTY_TIME_EDIT);
  }

  function selectEditTarget(player: ClockPlayer) {
    setTimeEdit((prev) => ({ ...prev, target: player, showCustomForm: false }));
  }

  function setPlayerTime(player: ClockPlayer, ms: number) {
    const clamped = Math.max(0, ms);
    const snapshot = snapshotRef.current;
    if (player === 'white') {
      snapshotRef.current = { ...snapshot, whiteMs: clamped };
      setWhiteMs(clamped);
    } else {
      snapshotRef.current = { ...snapshot, blackMs: clamped };
      setBlackMs(clamped);
    }
  }

  function adjustPlayerTime(player: ClockPlayer, deltaMs: number) {
    const current = player === 'white' ? snapshotRef.current.whiteMs : snapshotRef.current.blackMs;
    setPlayerTime(player, current + deltaMs);
  }

  function openCustomTimeEdit() {
    if (!timeEdit.target) return;
    const ms = timeEdit.target === 'white' ? whiteMs : blackMs;
    const totalSeconds = Math.ceil(ms / 1000);
    setCustomEditMinutes(String(Math.floor(totalSeconds / 60)));
    setCustomEditSeconds(String(totalSeconds % 60));
    setTimeEdit((prev) => ({ ...prev, showCustomForm: true }));
  }

  function applyCustomTimeEdit() {
    if (!timeEdit.target) return;
    const minutes = Math.max(0, Number.parseInt(customEditMinutes, 10) || 0);
    const seconds = Math.min(59, Math.max(0, Number.parseInt(customEditSeconds, 10) || 0));
    setPlayerTime(timeEdit.target, (minutes * 60 + seconds) * 1000);
    setTimeEdit((prev) => ({ ...prev, showCustomForm: false }));
  }

  function renderPlayerPanel(panel: PanelSide, rotated = false) {
    const assignedPlayer = sides[panel];
    const ms =
      assignedPlayer === 'white'
        ? whiteMs
        : assignedPlayer === 'black'
          ? blackMs
          : whiteMs;
    const awaitingStart = phase === 'playing' && sides.top === null;
    const isActive =
      phase === 'playing' && active !== null && assignedPlayer !== null && active === assignedPlayer;
    const isEditSelected =
      timeEdit.active && assignedPlayer !== null && timeEdit.target === assignedPlayer;
    const isEditSelectable = phase === 'paused' && timeEdit.active && assignedPlayer !== null;
    const showTenths = phase !== 'setup' && shouldShowTenths(ms);
    const isLow = phase === 'playing' && isActive && ms < 10_000;
    const label =
      assignedPlayer === 'white'
        ? 'Blancas'
        : assignedPlayer === 'black'
          ? 'Negras'
          : panel === 'top'
            ? 'Arriba'
            : 'Abajo';

    let panelBg = 'bg-[#0f0f0f]';
    if (isEditSelected) {
      panelBg = 'bg-pending/35 ring-2 ring-inset ring-pending';
    } else if (isActive) {
      panelBg = lowTimePulse && isLow ? 'bg-[#5c2020]' : 'bg-[#1e5c52]';
    } else if (awaitingStart) {
      panelBg = 'hover:bg-white/5';
    }

    const handlePanelClick = () => {
      if (isEditSelectable && assignedPlayer) {
        selectEditTarget(assignedPlayer);
        return;
      }
      handlePanelTap(panel);
    };

    const isDisabled =
      phase === 'finished' ||
      (phase === 'paused' && !timeEdit.active) ||
      (phase === 'playing' && !awaitingStart && !isActive);

    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={handlePanelClick}
        className={[
          'relative flex flex-1 flex-col items-center justify-center gap-2 border-0 p-4 transition-colors duration-300 select-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white/50',
          rotated ? 'rotate-180' : '',
          panelBg,
          isActive && !isEditSelected && 'ring-2 ring-inset ring-white/25',
          isEditSelectable && 'cursor-pointer hover:bg-white/5',
          awaitingStart && 'cursor-pointer active:brightness-110',
          phase === 'playing' && isActive ? 'cursor-pointer active:brightness-110' : '',
          phase === 'playing' && !isActive && !awaitingStart ? 'cursor-default' : '',
        ].join(' ')}
        aria-label={`${label}${isActive ? ', tu turno' : ''}${isEditSelected ? ', seleccionado para editar' : ''}${awaitingStart ? ', toca para jugar con blancas' : ''}`}
        aria-pressed={isActive || isEditSelected}
      >
        <span
          className={[
            'text-sm font-medium tracking-wide uppercase',
            isEditSelected ? 'text-white' : isActive ? 'text-white/90' : 'text-white/35',
          ].join(' ')}
        >
          {label}
        </span>
        <span
          className={[
            'font-display tabular-nums leading-none font-bold tracking-tight',
            showTenths ? 'text-[clamp(4rem,18vw,9rem)]' : 'text-[clamp(3.5rem,16vw,8rem)]',
            isEditSelected ? 'text-white' : isLow ? 'text-accent' : isActive ? 'text-white' : 'text-white/30',
          ].join(' ')}
        >
          {formatClockTime(ms, showTenths)}
        </span>
        {control.incrementSeconds > 0 && (
          <span
            className={
              isEditSelected || isActive ? 'text-xs text-white/70' : 'text-xs text-white/25'
            }
          >
            +{control.incrementSeconds}s por jugada
          </span>
        )}
        {isEditSelectable && !timeEdit.target && (
          <span className="absolute bottom-4 text-xs font-semibold tracking-wider text-white/60 uppercase">
            Toca para seleccionar
          </span>
        )}
        {awaitingStart && (
          <span className="absolute bottom-4 max-w-xs px-4 text-center text-xs font-semibold tracking-wider text-white/70 uppercase">
            Toca para jugar con blancas
          </span>
        )}
        {isActive && phase === 'playing' && (
          <span className="absolute bottom-4 text-xs font-semibold tracking-wider text-white/80 uppercase">
            Toca para pasar turno
          </span>
        )}
      </button>
    );
  }

  function renderTimeEditBar() {
    if (!timeEdit.active) return null;

    const editBtnClass =
      'rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10';

    if (timeEdit.showCustomForm && timeEdit.target) {
      const targetLabel = timeEdit.target === 'white' ? 'Blancas' : 'Negras';
      return (
        <div className="shrink-0 border-b border-white/10 bg-pending/15 px-4 py-4">
          <p className="mb-3 text-center text-sm font-medium text-white/80">
            Tiempo de {targetLabel}
          </p>
          <div className="mx-auto flex max-w-md flex-wrap items-end justify-center gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Min</span>
              <input
                type="number"
                min={0}
                max={180}
                value={customEditMinutes}
                onChange={(e) => setCustomEditMinutes(e.target.value)}
                className="w-20 rounded-xl border border-white/15 bg-dark px-3 py-2.5 text-center text-white outline-none focus:border-pending"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-white/60">Seg</span>
              <input
                type="number"
                min={0}
                max={59}
                value={customEditSeconds}
                onChange={(e) => setCustomEditSeconds(e.target.value)}
                className="w-20 rounded-xl border border-white/15 bg-dark px-3 py-2.5 text-center text-white outline-none focus:border-pending"
              />
            </label>
            <button type="button" onClick={applyCustomTimeEdit} className={editBtnClass}>
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => setTimeEdit((prev) => ({ ...prev, showCustomForm: false }))}
              className={editBtnClass}
            >
              Volver
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="shrink-0 border-b border-white/10 bg-pending/15 px-4 py-4">
        {!timeEdit.target ? (
          <p className="text-center text-sm font-medium text-white/80">
            Selecciona el reloj que quieres modificar
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => adjustPlayerTime(timeEdit.target!, 10_000)}
              className={editBtnClass}
            >
              +10 s
            </button>
            <button
              type="button"
              onClick={() => adjustPlayerTime(timeEdit.target!, 60_000)}
              className={editBtnClass}
            >
              +1 min
            </button>
            <button type="button" onClick={openCustomTimeEdit} className={editBtnClass}>
              Editar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kiosk-shell flex min-h-[calc(100dvh-2rem)] flex-col overflow-hidden md:min-h-[calc(100dvh-3rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div>
          <p className="font-display text-lg font-bold md:text-xl">Reloj de ajedrez</p>
          <p className="text-xs text-white/50 md:text-sm">
            {formatTimeControl(control)} · funciona sin conexión
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Inicio
          </a>
          {phase !== 'setup' && (
            <>
              {phase === 'playing' && (
                <button
                  type="button"
                  onClick={pauseGame}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Pausar
                </button>
              )}
              {phase === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={resumeGame}
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink hover:opacity-90"
                  >
                    Reanudar
                  </button>
                  {timeEdit.active ? (
                    <button
                      type="button"
                      onClick={finishTimeEdit}
                      className="rounded-full border border-pending/50 bg-pending/20 px-4 py-2 text-sm font-semibold text-white hover:bg-pending/30"
                    >
                      Listo
                    </button>
                  ) : (
                    snapshotRef.current.sides.top !== null && (
                      <button
                        type="button"
                        onClick={startTimeEdit}
                        className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Editar tiempos
                      </button>
                    )
                  )}
                </>
              )}
              <button
                type="button"
                onClick={resetToSetup}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Reiniciar
              </button>
            </>
          )}
        </div>
      </header>

      {phase === 'setup' ? (
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
          <section>
            <h2 className="font-display mb-3 text-base font-semibold text-white/80">Controles populares</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {CLOCK_PRESETS.map((preset) => {
                const selected = controlsMatch(control, preset.control);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => selectPreset(preset.control)}
                    className={[
                      'rounded-xl border px-3 py-3 text-center font-display text-lg font-bold transition-colors',
                      selected
                        ? 'border-white bg-white text-ink'
                        : 'border-white/15 bg-dark-card text-white hover:border-white/30',
                    ].join(' ')}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="kiosk-panel p-4 md:p-5">
            <h2 className="font-display mb-3 text-base font-semibold text-white/80">Personalizado</h2>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Minutos</span>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-dark px-3 py-2.5 text-white outline-none focus:border-white/40"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-white/60">Incremento (seg)</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={customIncrement}
                  onChange={(e) => setCustomIncrement(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-dark px-3 py-2.5 text-white outline-none focus:border-white/40"
                />
              </label>
              <button
                type="button"
                onClick={applyCustomControl}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Aplicar
              </button>
            </div>
            {customError && <p className="mt-2 text-sm text-accent">{customError}</p>}
          </section>

          <div className="mt-auto flex flex-col items-center gap-3 pb-2">
            <button
              type="button"
              onClick={startGame}
              className="w-full max-w-md rounded-full bg-white px-8 py-4 font-display text-lg font-bold text-ink shadow-lg hover:opacity-90"
            >
              Iniciar partida · {formatTimeControl(control)}
            </button>
            <p className="max-w-md text-center text-xs text-white/45">
              Coloca el dispositivo entre ambos jugadores. Quien toque primero su lado juega con
              blancas y arranca el reloj. Después, cada uno toca su lado al completar su jugada.
              La primera visita requiere internet; después funciona sin conexión.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {phase === 'finished' && winner && (
            <div className="shrink-0 border-b border-white/10 bg-accent/20 px-4 py-3 text-center">
              <p className="font-display text-lg font-bold">
                {winner === 'white' ? 'Blancas' : 'Negras'} ganan por tiempo
              </p>
            </div>
          )}
          {phase === 'paused' && !timeEdit.active && (
            <div className="shrink-0 border-b border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-medium text-white/80">
              Partida en pausa
            </div>
          )}
          {phase === 'playing' && sides.top === null && (
            <div className="shrink-0 border-b border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-medium text-white/80">
              Toca tu lado para jugar con blancas e iniciar el reloj
            </div>
          )}
          {renderTimeEditBar()}
          <div className="flex min-h-0 flex-1 flex-col">
            {renderPlayerPanel('top', true)}
            <div className="h-px shrink-0 bg-white/15" aria-hidden="true" />
            {renderPlayerPanel('bottom', false)}
          </div>
        </div>
      )}
    </div>
  );
}
