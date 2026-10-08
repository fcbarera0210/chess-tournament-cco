import { useState } from 'react';
import { AdminButton } from './AdminButton';
import { AdminFormSection as FormSection } from './AdminFormSection';
import { AdminPillGroup } from './AdminPillGroup';
import { AdminSwitch } from './AdminSwitch';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { MIN_TEAMS_FOR_TEAM_TOURNAMENT } from '../../lib/team-constants';
import { TIME_CONTROL_PRESETS } from '../../lib/tournament-presets';

type Format = 'swiss' | 'knockout';

function ModeCard({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className="admin-option-card">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] ${
            selected ? 'border-ink' : 'border-border'
          }`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-ink" />}
        </span>
      </span>
      <span className="text-xs text-muted">{description}</span>
    </button>
  );
}

export function TournamentCreateForm() {
  const { run, isLoading } = useAsyncAction();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    eventDate: new Date().toISOString().slice(0, 10),
    venue: '',
    maxPlayers: 20,
    format: 'swiss' as Format,
    timeControl: '10+5',
    showOnHome: false,
    publicRegistration: false,
    isTeamTournament: false,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTeamMode(isTeamTournament: boolean) {
    setForm((prev) => ({
      ...prev,
      isTeamTournament,
      format: isTeamTournament ? 'swiss' : prev.format,
      publicRegistration: isTeamTournament ? false : prev.publicRegistration,
    }));
  }

  function setShowOnHome(showOnHome: boolean) {
    setForm((prev) => ({
      ...prev,
      showOnHome,
      publicRegistration: showOnHome ? prev.publicRegistration : false,
    }));
  }

  function setPublicRegistration(publicRegistration: boolean) {
    setForm((prev) => ({
      ...prev,
      publicRegistration,
      showOnHome: publicRegistration ? true : prev.showOnHome,
    }));
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
          timeControl: form.timeControl.trim() || '10+5',
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

      window.location.href = form.isTeamTournament ? '/admin/equipos' : '/admin/torneo';
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 pb-4">
      <div>
        <a href="/admin/torneos" className="admin-link-back">
          ← Torneos
        </a>
        <h1 className="mt-2 font-display text-3xl font-bold">Nuevo torneo</h1>
        <p className="mt-1 text-muted">
          Completa lo esencial ahora; horarios, mapa y el resto se ajustan después en Configuración.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <FormSection step={1} title="Datos del evento">
        <label className="block">
          <span className="text-sm font-medium">Nombre del torneo</span>
          <input
            type="text"
            required
            minLength={2}
            autoFocus
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="admin-input mt-1 w-full"
            placeholder="Chess Tournament Curicó 2027"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Fecha</span>
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
            <span className="ml-1 text-xs text-muted">(opcional)</span>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => update('venue', e.target.value)}
              className="admin-input mt-1 w-full"
              placeholder="Curicó"
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        step={2}
        title="Modalidad y formato"
        description="Define cómo se juega y se clasifica el torneo."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            selected={!form.isTeamTournament}
            title="Individual"
            description="Cada jugador suma para sí mismo."
            onSelect={() => setTeamMode(false)}
          />
          <ModeCard
            selected={form.isTeamTournament}
            title="Por equipos"
            description="Clasificación por suma de puntos del equipo (estilo Olympiad)."
            onSelect={() => setTeamMode(true)}
          />
        </div>

        <div>
          <span className="text-sm font-medium">Formato</span>
          <AdminPillGroup
            label="Formato"
            className="mt-2"
            value={form.format}
            onChange={(value) => update('format', value as Format)}
            options={[
              { value: 'swiss', label: 'Suizo' },
              { value: 'knockout', label: 'Eliminatoria', disabled: form.isTeamTournament },
            ]}
          />
          {form.isTeamTournament && (
            <p className="mt-2 text-xs text-muted">Los torneos por equipos solo usan sistema suizo.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <span className="text-sm font-medium">Ritmo de juego</span>
            <span className="ml-1 text-xs text-muted">(minutos + incremento)</span>
            <AdminPillGroup
              label="Ritmo de juego"
              className="mt-2"
              value={form.timeControl}
              onChange={(value) => update('timeControl', value)}
              options={TIME_CONTROL_PRESETS.map((preset) => ({ value: preset, label: preset }))}
            />
            <input
              type="text"
              value={form.timeControl}
              onChange={(e) => update('timeControl', e.target.value)}
              className="admin-input mt-2 w-full sm:max-w-[10rem]"
              placeholder="Otro, ej. 3+2"
              aria-label="Ritmo de juego personalizado"
            />
          </div>
          <label className="block sm:w-36">
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
        </div>

        {form.isTeamTournament && (
          <p className="rounded-lg border border-border bg-bg px-4 py-3 text-sm text-muted">
            Al crear el torneo te llevaremos a <span className="font-medium text-ink">Equipos</span>{' '}
            para que crees al menos {MIN_TEAMS_FOR_TEAM_TOURNAMENT}. Luego podrás inscribir jugadores
            y abrir la inscripción.
          </p>
        )}
      </FormSection>

      <FormSection
        step={3}
        title="Visibilidad"
        description="Puedes dejarlo privado y publicarlo más adelante."
      >
        <AdminSwitch
          label="Mostrar en home"
          description="Destaca el torneo en el home mientras tenga inscripción abierta o esté en juego."
          checked={form.showOnHome}
          onChange={setShowOnHome}
        />
        <div className="border-t border-border" />
        <AdminSwitch
          label="Abrir inscripción pública"
          description={
            form.isTeamTournament
              ? `Disponible cuando el torneo tenga al menos ${MIN_TEAMS_FOR_TEAM_TOURNAMENT} equipos (desde Configuración).`
              : 'Habilita el formulario de inscripción en la web. Requiere mostrarlo en el home.'
          }
          checked={form.publicRegistration}
          disabled={form.isTeamTournament}
          onChange={setPublicRegistration}
        />
      </FormSection>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a href="/admin/torneos" className="admin-btn admin-btn-secondary">
          Cancelar
        </a>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <AdminButton type="submit" loading={isLoading('create')} className="px-6">
            {form.isTeamTournament ? 'Crear y configurar equipos' : 'Crear torneo'}
          </AdminButton>
          <span className="text-center text-xs text-muted sm:text-right">
            {form.publicRegistration
              ? 'Se creará con la inscripción abierta.'
              : 'Se creará como borrador.'}
          </span>
        </div>
      </div>
    </form>
  );
}
