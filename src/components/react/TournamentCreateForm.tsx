import { useState } from 'react';
import { AdminButton } from './AdminButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export function TournamentCreateForm() {
  const { run, isLoading } = useAsyncAction();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    eventDate: new Date().toISOString().slice(0, 10),
    venue: '',
    maxPlayers: 20,
    showOnHome: false,
    publicRegistration: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    await run('create', async () => {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: form.publicRegistration ? 'registration_open' : 'draft',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al crear torneo');
        return;
      }

      await fetch('/api/admin/tournament-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: data.tournament.id }),
      });

      window.location.href = '/admin/torneo';
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Nuevo torneo</h1>
        <p className="mt-1 text-muted">Crea un torneo interno o público con inscripción.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="admin-card space-y-4 p-5">
        <label className="block">
          <span className="text-sm font-medium">Nombre del torneo</span>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="admin-input mt-1 w-full"
            placeholder="Chess Tournament Curicó 2027"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Fecha del evento</span>
          <input
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => update('eventDate', e.target.value)}
            className="admin-input mt-1 w-full"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Lugar</span>
          <input
            type="text"
            value={form.venue}
            onChange={(e) => update('venue', e.target.value)}
            className="admin-input mt-1 w-full"
            placeholder="Curicó"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Cupo máximo</span>
          <input
            type="number"
            min={2}
            max={200}
            value={form.maxPlayers}
            onChange={(e) => update('maxPlayers', Number(e.target.value))}
            className="admin-input mt-1 w-full"
          />
        </label>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Visibilidad</p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.showOnHome}
              onChange={(e) => update('showOnHome', e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">Mostrar en home</span>
              <span className="text-xs text-muted">
                Visible como torneo destacado o en archivos públicos al finalizar.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.publicRegistration}
              onChange={(e) => update('publicRegistration', e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">Inscripción pública</span>
              <span className="text-xs text-muted">
                Habilita el formulario de inscripción en la web.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <AdminButton type="submit" loading={isLoading('create')}>
          Crear torneo
        </AdminButton>
        <a href="/admin/torneos" className="admin-btn admin-btn-secondary">
          Cancelar
        </a>
      </div>
    </form>
  );
}
