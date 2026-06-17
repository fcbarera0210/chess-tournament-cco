import { useEffect, useState } from 'react';

type Tournament = {
  id: string;
  name: string;
  venue: string;
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/tournament');
    const data = await res.json();
    setTournament(data.tournament);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(updates: Partial<Tournament>) {
    if (!tournament) return;
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/tournament', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setMessage('Guardado');
      load();
    } else {
      setMessage('Error al guardar');
    }
    setSaving(false);
  }

  async function startTournament() {
    setSaving(true);
    const res = await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_tournament' }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = `/admin/rondas/${data.round.roundNumber}`;
    } else {
      setMessage(data.error ?? 'Error');
    }
    setSaving(false);
  }

  if (!tournament) return <p>Cargando...</p>;

  const canStart = tournament.status !== 'live' && tournament.status !== 'finished';

  return (
    <div className="space-y-6">
      {message && <p className="text-sm text-teal">{message}</p>}

      <div className="grid gap-4 rounded-2xl border border-sand bg-white p-4">
        <label className="block">
          <span className="text-sm font-medium">Nombre del evento</span>
          <input
            className="mt-1 w-full rounded-xl border border-sand px-4 py-2"
            value={tournament.name}
            onChange={(e) => setTournament({ ...tournament, name: e.target.value })}
            onBlur={() => save({ name: tournament.name })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Lugar</span>
          <input
            className="mt-1 w-full rounded-xl border border-sand px-4 py-2"
            value={tournament.venue}
            onChange={(e) => setTournament({ ...tournament, venue: e.target.value })}
            onBlur={() => save({ venue: tournament.venue })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Hora inicio</span>
            <input
              className="mt-1 w-full rounded-xl border border-sand px-4 py-2"
              value={tournament.eventTimeStart}
              onChange={(e) => setTournament({ ...tournament, eventTimeStart: e.target.value })}
              onBlur={() => save({ eventTimeStart: tournament.eventTimeStart })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Hora fin</span>
            <input
              className="mt-1 w-full rounded-xl border border-sand px-4 py-2"
              value={tournament.eventTimeEnd}
              onChange={(e) => setTournament({ ...tournament, eventTimeEnd: e.target.value })}
              onBlur={() => save({ eventTimeEnd: tournament.eventTimeEnd })}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Control de tiempo</span>
          <input
            className="mt-1 w-full rounded-xl border border-sand px-4 py-2"
            value={tournament.timeControl}
            onChange={(e) => setTournament({ ...tournament, timeControl: e.target.value })}
            onBlur={() => save({ timeControl: tournament.timeControl })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Cupo máximo</span>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-sand px-4 py-2"
            value={tournament.maxPlayers}
            onChange={(e) =>
              setTournament({ ...tournament, maxPlayers: parseInt(e.target.value, 10) })
            }
            onBlur={() => save({ maxPlayers: tournament.maxPlayers })}
          />
        </label>

        {canStart && (
          <div>
            <span className="text-sm font-medium">Formato</span>
            <div className="mt-2 flex gap-3">
              {(['swiss', 'knockout'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setTournament({ ...tournament, format: f });
                    save({ format: f });
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${tournament.format === f ? 'bg-teal text-white' : 'bg-sand'}`}
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
              onClick={() => save({ status: 'registration_open' })}
              className={`rounded-full px-4 py-2 text-sm ${tournament.status === 'registration_open' ? 'bg-teal text-white' : 'bg-sand'}`}
            >
              Abiertas
            </button>
            <button
              type="button"
              onClick={() => save({ status: 'registration_closed' })}
              className={`rounded-full px-4 py-2 text-sm ${tournament.status === 'registration_closed' ? 'bg-teal text-white' : 'bg-sand'}`}
            >
              Cerradas
            </button>
          </div>
        </div>
      </div>

      {canStart && (
        <button
          type="button"
          disabled={saving}
          onClick={startTournament}
          className="w-full rounded-xl bg-teal py-4 text-lg font-bold text-white hover:bg-teal-light disabled:opacity-60"
        >
          Iniciar torneo (crear ronda 1)
        </button>
      )}
    </div>
  );
}
