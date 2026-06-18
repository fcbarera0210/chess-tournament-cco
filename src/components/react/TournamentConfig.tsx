import { useEffect, useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

type Tournament = {
  id: string;
  name: string;
  eventDate: string;
  venue: string;
  venueMapsUrl: string | null;
  eventTimeStart: string;
  eventTimeEnd: string;
  timeControl: string;
  maxPlayers: number;
  plannedRounds: number;
  format: 'swiss' | 'knockout';
  status: string;
  waitlistEnabled: boolean;
};

export function TournamentConfig() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [message, setMessage] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const { run, isLoading } = useAsyncAction();

  async function load() {
    const res = await fetch('/api/tournament');
    const data = await res.json();
    setTournament(data.tournament);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!resetModalOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setResetModalOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [resetModalOpen]);

  async function resetTournament(mode: 'rounds' | 'full') {
    await run(`reset-${mode}`, async () => {
      setMessage('');
      const res = await fetch('/api/tournament/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setMessage(mode === 'full' ? 'Torneo reiniciado por completo' : 'Rondas reiniciadas');
        setResetModalOpen(false);
        await load();
      } else {
        setMessage('Error al reiniciar el torneo');
      }
    });
  }

  async function save(updates: Partial<Tournament>, actionId: string) {
    if (!tournament) return;
    await run(actionId, async () => {
      setMessage('');
      const res = await fetch('/api/tournament', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setMessage('Guardado');
        await load();
      } else {
        setMessage('Error al guardar');
      }
    });
  }

  if (!tournament) return <p className="text-muted">Cargando...</p>;

  const canEditFormatFields =
    tournament.status === 'draft' ||
    tournament.status === 'registration_open' ||
    tournament.status === 'registration_closed';
  const saving = isLoading('save-blur') || isLoading('format') || isLoading('registration');
  const resetting = isLoading('reset-rounds') || isLoading('reset-full');

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`text-sm ${
            message === 'Guardado' ||
            message === 'Rondas reiniciadas' ||
            message === 'Torneo reiniciado por completo'
              ? 'text-finished'
              : 'text-muted'
          }`}
        >
          {message}
        </p>
      )}

      <div className="admin-card grid gap-4 p-5">
        <label className="block">
          <span className="text-sm font-medium">Nombre del evento</span>
          <input
            className="admin-input mt-1"
            value={tournament.name}
            onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
            onBlur={() => save({ name: tournament.name }, 'save-blur')}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Fecha del evento</span>
          <input
            type="date"
            className="admin-input mt-1"
            value={tournament.eventDate}
            onChange={(e) => setTournament({ ...tournament, eventDate: e.target.value })}
            onBlur={() => save({ eventDate: tournament.eventDate }, 'save-blur')}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Lugar</span>
          <input
            className="admin-input mt-1"
            value={tournament.venue}
            onChange={(e) => setTournament({ ...tournament, venue: e.target.value })}
            onBlur={() => save({ venue: tournament.venue }, 'save-blur')}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Link Google Maps</span>
          <input
            type="url"
            className="admin-input mt-1"
            placeholder="https://maps.google.com/..."
            value={tournament.venueMapsUrl ?? ''}
            onChange={(e) => setTournament({ ...tournament, venueMapsUrl: e.target.value })}
            onBlur={() => save({ venueMapsUrl: tournament.venueMapsUrl ?? '' }, 'save-blur')}
            disabled={saving}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Hora inicio</span>
            <input
              className="admin-input mt-1"
              value={tournament.eventTimeStart}
              onChange={(e) => setTournament({ ...tournament, eventTimeStart: e.target.value })}
              onBlur={() => save({ eventTimeStart: tournament.eventTimeStart }, 'save-blur')}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Hora fin</span>
            <input
              className="admin-input mt-1"
              value={tournament.eventTimeEnd}
              onChange={(e) => setTournament({ ...tournament, eventTimeEnd: e.target.value })}
              onBlur={() => save({ eventTimeEnd: tournament.eventTimeEnd }, 'save-blur')}
              disabled={saving}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Control de tiempo</span>
          <input
            className="admin-input mt-1"
            value={tournament.timeControl}
            onChange={(e) => setTournament({ ...tournament, timeControl: e.target.value })}
            onBlur={() => save({ timeControl: tournament.timeControl }, 'save-blur')}
            disabled={saving}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Cupo máximo</span>
          <input
            type="number"
            className="admin-input mt-1"
            value={tournament.maxPlayers}
            onChange={(e) =>
              setTournament({ ...tournament, maxPlayers: parseInt(e.target.value, 10) })
            }
            onBlur={() => save({ maxPlayers: tournament.maxPlayers }, 'save-blur')}
            disabled={saving}
          />
        </label>

        {canEditFormatFields && (
          <div>
            <span className="text-sm font-medium">Formato</span>
            <div className="mt-2 flex gap-2">
              {(['swiss', 'knockout'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  disabled={isLoading('format')}
                  onClick={() => {
                    setTournament({ ...tournament, format: f });
                    save({ format: f }, 'format');
                  }}
                  className={
                    tournament.format === f
                      ? 'admin-chip admin-chip-active'
                      : 'admin-chip admin-chip-inactive'
                  }
                >
                  {f === 'swiss' ? 'Suizo' : 'Eliminatoria'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="text-sm font-medium">Inscripciones</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isLoading('registration')}
              onClick={() => save({ status: 'registration_open' }, 'registration')}
              className={
                tournament.status === 'registration_open'
                  ? 'admin-chip admin-chip-active'
                  : 'admin-chip admin-chip-inactive'
              }
            >
              Abiertas
            </button>
            <button
              type="button"
              disabled={isLoading('registration')}
              onClick={() => save({ status: 'registration_closed' }, 'registration')}
              className={
                tournament.status === 'registration_closed'
                  ? 'admin-chip admin-chip-active'
                  : 'admin-chip admin-chip-inactive'
              }
            >
              Cerradas
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card p-5">
        <h2 className="font-display text-lg font-bold">Zona de pruebas</h2>
        <p className="mt-2 text-sm text-muted">
          Borra datos de prueba del torneo. Esta acción no se puede deshacer.
        </p>
        <AdminButton
          variant="danger"
          className="mt-4"
          onClick={() => setResetModalOpen(true)}
          disabled={resetting}
        >
          Reiniciar torneo
        </AdminButton>
      </div>

      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setResetModalOpen(false)}
          role="presentation"
        >
          <div
            className="admin-card w-full max-w-md p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-tournament-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="reset-tournament-title" className="font-display text-xl font-bold">
              Reiniciar torneo
            </h2>
            <p className="mt-2 text-sm text-muted">
              Elige qué datos quieres borrar. Esta acción es irreversible.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <AdminButton
                variant="secondary"
                className="w-full"
                loading={isLoading('reset-rounds')}
                disabled={resetting}
                onClick={() => resetTournament('rounds')}
              >
                Reiniciar solo rondas
              </AdminButton>
              <AdminButton
                variant="danger"
                className="w-full"
                loading={isLoading('reset-full')}
                disabled={resetting}
                onClick={() => resetTournament('full')}
              >
                Reiniciar rondas e inscripciones
              </AdminButton>
              <AdminButton
                variant="secondary"
                className="w-full"
                disabled={resetting}
                onClick={() => setResetModalOpen(false)}
              >
                Cancelar
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
