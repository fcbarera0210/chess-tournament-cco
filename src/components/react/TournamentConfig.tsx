import { useEffect, useRef, useState } from 'react';
import { AdminButton } from './AdminButton';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { AdminFormSection } from './AdminFormSection';
import { AdminPillGroup } from './AdminPillGroup';
import { AdminSwitch } from './AdminSwitch';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAdminTournament } from '../../hooks/useAdminTournament';
import { adminApiUrl } from '../../lib/admin-api';
import { showAdminToast } from '../../lib/admin-toast';
import { MIN_TEAMS_FOR_TEAM_TOURNAMENT } from '../../lib/team-constants';
import { TIME_CONTROL_PRESETS } from '../../lib/tournament-presets';
import { AdminTournamentPublicLinks } from './AdminTournamentPublicLinks';

type Tournament = {
  id: string;
  name: string;
  slug: string;
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
  showOnHome: boolean;
  publicRegistration: boolean;
  isTeamTournament: boolean;
};

type TextField =
  | 'name'
  | 'eventDate'
  | 'venue'
  | 'venueMapsUrl'
  | 'eventTimeStart'
  | 'eventTimeEnd'
  | 'timeControl'
  | 'maxPlayers'
  | 'plannedRounds';

type Feedback = { field: string; ok: boolean; text: string };

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  registration_open: 'Inscripciones abiertas',
  registration_closed: 'Inscripciones cerradas',
  live: 'En juego',
  finished: 'Finalizado',
};

function mergeFromServer(
  draft: Tournament | null,
  base: Tournament | null,
  server: Tournament,
  savedKeys: string[],
): Tournament {
  if (!draft || !base) return server;
  const next: Record<string, unknown> = { ...server };
  for (const key of Object.keys(server) as (keyof Tournament)[]) {
    if (!savedKeys.includes(key) && draft[key] !== base[key]) next[key] = draft[key];
  }
  return next as Tournament;
}

export function TournamentConfig() {
  const { tournamentId, loading: ctxLoading } = useAdminTournament();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [original, setOriginal] = useState<Tournament | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [disableTeamsModalOpen, setDisableTeamsModalOpen] = useState(false);
  const { run, isLoading } = useAsyncAction();

  async function load() {
    if (!tournamentId) return;
    const [tournamentRes, teamsRes] = await Promise.all([
      fetch(adminApiUrl('/api/tournament', tournamentId)),
      fetch(adminApiUrl('/api/teams', tournamentId)),
    ]);
    const data = await tournamentRes.json();
    const teamsData = await teamsRes.json().catch(() => ({}));
    setTournament(data.tournament);
    setOriginal(data.tournament);
    setTeamCount((teamsData.teams ?? []).length);
  }

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId]);

  useEffect(() => {
    if (!resetModalOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setResetModalOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [resetModalOpen]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  function showFeedback(next: Feedback) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(next);
    feedbackTimer.current = setTimeout(() => setFeedback(null), next.ok ? 2500 : 6000);
  }

  function revert(keys: (keyof Tournament)[]) {
    if (!original) return;
    setTournament((prev) => {
      if (!prev) return prev;
      const next: Record<string, unknown> = { ...prev };
      for (const key of keys) next[key] = original[key];
      return next as Tournament;
    });
  }

  async function save(updates: Partial<Tournament>, field: string, revertOnError = true) {
    if (!tournamentId) return false;
    const keys = Object.keys(updates) as (keyof Tournament)[];
    let ok = false;
    await run(`save:${field}`, async () => {
      const res = await fetch(adminApiUrl('/api/tournament', tournamentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.tournament) {
        ok = true;
        setTournament((prev) => mergeFromServer(prev, original, data.tournament, keys));
        setOriginal(data.tournament);
        showFeedback({ field, ok: true, text: 'Guardado' });
      } else {
        if (revertOnError) revert(keys);
        showFeedback({ field, ok: false, text: data.error ?? 'Error al guardar' });
      }
    });
    return ok;
  }

  function saveField(field: TextField) {
    if (!tournament || !original) return;
    const value = tournament[field];
    if (value === original[field]) return;

    if (field === 'name' && String(value).trim().length < 2) {
      revert([field]);
      showFeedback({ field, ok: false, text: 'El nombre debe tener al menos 2 caracteres' });
      return;
    }
    if ((field === 'maxPlayers' || field === 'plannedRounds') && !Number.isFinite(value)) {
      revert([field]);
      return;
    }

    const payload = field === 'venueMapsUrl' ? { venueMapsUrl: value ?? '' } : { [field]: value };
    save(payload as Partial<Tournament>, field, false);
  }

  function setField<K extends keyof Tournament>(key: K, value: Tournament[K]) {
    setTournament((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function FieldStatus({ field }: { field: string }) {
    if (isLoading(`save:${field}`)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <span className="admin-spinner" aria-hidden="true" />
          Guardando
        </span>
      );
    }
    if (feedback?.field !== field) return null;
    return (
      <span
        role={feedback.ok ? 'status' : 'alert'}
        className={`text-xs font-medium ${feedback.ok ? 'text-finished' : 'text-red-600'}`}
      >
        {feedback.ok ? `✓ ${feedback.text}` : feedback.text}
      </span>
    );
  }

  function FieldLabel({ field, children }: { field: string; children: string }) {
    return (
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{children}</span>
        <FieldStatus field={field} />
      </span>
    );
  }

  async function resetTournament(mode: 'rounds' | 'full') {
    if (!tournamentId) return;
    await run(`reset-${mode}`, async () => {
      const res = await fetch(adminApiUrl('/api/tournament/reset', tournamentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        showAdminToast(
          mode === 'full' ? 'Torneo reiniciado por completo' : 'Rondas reiniciadas',
          'success',
        );
        setResetModalOpen(false);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        showAdminToast(data.error ?? 'Error al reiniciar el torneo', 'error');
      }
    });
  }

  if (ctxLoading || !tournament) return <p className="text-muted">Cargando...</p>;

  const t = tournament;
  const canEditFormatFields =
    t.status === 'draft' || t.status === 'registration_open' || t.status === 'registration_closed';
  const isFinished = t.status === 'finished';
  const teamsMissing = t.isTeamTournament && teamCount < MIN_TEAMS_FOR_TEAM_TOURNAMENT;
  const resetting = isLoading('reset-rounds') || isLoading('reset-full');

  async function exportData() {
    if (!tournamentId) return;
    await run('export', async () => {
      const res = await fetch(adminApiUrl('/api/tournament/export', tournamentId));
      if (!res.ok) {
        showAdminToast('Error al exportar datos', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.slug}-export.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showAdminToast('Exportación descargada', 'success');
    });
  }

  function setTeamMode(isTeamTournament: boolean) {
    if (!isTeamTournament) {
      setDisableTeamsModalOpen(true);
      return;
    }
    setTournament({ ...t, isTeamTournament: true, format: 'swiss' });
    save({ isTeamTournament: true, format: 'swiss' }, 'isTeamTournament');
  }

  async function confirmDisableTeams() {
    setTournament({ ...t, isTeamTournament: false });
    await save({ isTeamTournament: false }, 'isTeamTournament');
    setDisableTeamsModalOpen(false);
    await load();
  }

  function setShowOnHome(showOnHome: boolean) {
    const updates = showOnHome ? { showOnHome } : { showOnHome, publicRegistration: false };
    setTournament({ ...t, ...updates });
    save(updates, 'visibility');
  }

  function setPublicRegistration(publicRegistration: boolean) {
    const updates = publicRegistration
      ? { publicRegistration, showOnHome: true }
      : { publicRegistration };
    setTournament({ ...t, ...updates });
    save(updates, 'visibility');
  }

  function setStatus(status: string) {
    setTournament({ ...t, status });
    save({ status }, 'status');
  }

  const formatLabel = t.format === 'swiss' ? 'Suizo' : 'Eliminatoria';

  return (
    <div className="space-y-5">
      <AdminFormSection title="Datos del evento" description="Los cambios se guardan al salir de cada campo.">
        <label className="block">
          <FieldLabel field="name">Nombre del evento</FieldLabel>
          <input
            className="admin-input mt-1"
            value={t.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => saveField('name')}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel field="eventDate">Fecha</FieldLabel>
            <input
              type="date"
              className="admin-input mt-1"
              value={t.eventDate}
              onChange={(e) => setField('eventDate', e.target.value)}
              onBlur={() => saveField('eventDate')}
            />
          </label>
          <label className="block">
            <FieldLabel field="venue">Lugar</FieldLabel>
            <input
              className="admin-input mt-1"
              value={t.venue}
              onChange={(e) => setField('venue', e.target.value)}
              onBlur={() => saveField('venue')}
            />
          </label>
        </div>

        <label className="block">
          <FieldLabel field="venueMapsUrl">Link Google Maps</FieldLabel>
          <input
            type="url"
            className="admin-input mt-1"
            placeholder="https://maps.google.com/..."
            value={t.venueMapsUrl ?? ''}
            onChange={(e) => setField('venueMapsUrl', e.target.value)}
            onBlur={() => saveField('venueMapsUrl')}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <FieldLabel field="eventTimeStart">Hora inicio</FieldLabel>
            <input
              className="admin-input mt-1"
              placeholder="15:00"
              value={t.eventTimeStart}
              onChange={(e) => setField('eventTimeStart', e.target.value)}
              onBlur={() => saveField('eventTimeStart')}
            />
          </label>
          <label className="block">
            <FieldLabel field="eventTimeEnd">Hora fin</FieldLabel>
            <input
              className="admin-input mt-1"
              placeholder="20:00"
              value={t.eventTimeEnd}
              onChange={(e) => setField('eventTimeEnd', e.target.value)}
              onBlur={() => saveField('eventTimeEnd')}
            />
          </label>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Juego" description="Modalidad, formato y ritmo de las partidas.">
        <div>
          <AdminSwitch
            label="Torneo por equipos"
            description={
              canEditFormatFields ? (
                <>
                  Clasificación por suma de puntos de los jugadores (estilo Olympiad).
                  {t.isTeamTournament && (
                    <>
                      {' '}
                      Tienes {teamCount} equipo{teamCount === 1 ? '' : 's'} ·{' '}
                      <a href="/admin/equipos" className="font-medium text-ink underline">
                        Gestionar equipos
                      </a>
                    </>
                  )}
                </>
              ) : (
                'No se puede cambiar una vez iniciado el torneo.'
              )
            }
            checked={t.isTeamTournament}
            disabled={!canEditFormatFields || isLoading('save:isTeamTournament')}
            onChange={setTeamMode}
          />
          <div className="mt-1">
            <FieldStatus field="isTeamTournament" />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Formato</span>
            <FieldStatus field="format" />
          </span>
          {canEditFormatFields ? (
            <>
              <AdminPillGroup
                label="Formato"
                className="mt-2"
                value={t.format}
                disabled={isLoading('save:format')}
                onChange={(value) => {
                  const format = value as Tournament['format'];
                  setField('format', format);
                  save({ format }, 'format');
                }}
                options={[
                  { value: 'swiss', label: 'Suizo' },
                  { value: 'knockout', label: 'Eliminatoria', disabled: t.isTeamTournament },
                ]}
              />
              {t.isTeamTournament && (
                <p className="mt-2 text-xs text-muted">Por equipos solo admite formato suizo.</p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {formatLabel} · no se puede cambiar una vez iniciado el torneo.
            </p>
          )}
        </div>

        <div>
          <FieldLabel field="timeControl">Ritmo de juego</FieldLabel>
          <AdminPillGroup
            label="Ritmo de juego"
            className="mt-2"
            value={t.timeControl}
            onChange={(timeControl) => {
              setField('timeControl', timeControl);
              save({ timeControl }, 'timeControl');
            }}
            options={TIME_CONTROL_PRESETS.map((preset) => ({ value: preset, label: preset }))}
          />
          <input
            className="admin-input mt-2 w-full sm:max-w-[10rem]"
            placeholder="Otro, ej. 3+2"
            aria-label="Ritmo de juego personalizado"
            value={t.timeControl}
            onChange={(e) => setField('timeControl', e.target.value)}
            onBlur={() => saveField('timeControl')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <FieldLabel field="maxPlayers">Cupo máximo</FieldLabel>
            <input
              type="number"
              min={2}
              max={200}
              className="admin-input mt-1"
              value={Number.isFinite(t.maxPlayers) ? t.maxPlayers : ''}
              onChange={(e) => setField('maxPlayers', parseInt(e.target.value, 10))}
              onBlur={() => saveField('maxPlayers')}
            />
          </label>
          {t.format === 'swiss' && (
            <label className="block">
              <FieldLabel field="plannedRounds">Rondas</FieldLabel>
              <input
                type="number"
                min={1}
                max={15}
                className="admin-input mt-1"
                disabled={isFinished}
                value={Number.isFinite(t.plannedRounds) ? t.plannedRounds : ''}
                onChange={(e) => setField('plannedRounds', parseInt(e.target.value, 10))}
                onBlur={() => saveField('plannedRounds')}
              />
            </label>
          )}
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Visibilidad e inscripción"
        description="Controla qué ve el público y si se aceptan inscripciones."
      >
        <AdminSwitch
          label="Mostrar en home"
          description={
            isFinished
              ? 'Ya finalizado: el historial del home lista todos los torneos terminados.'
              : 'Destaca el torneo en el home mientras tenga inscripción abierta o esté en juego.'
          }
          checked={t.showOnHome}
          disabled={isFinished || isLoading('save:visibility')}
          onChange={setShowOnHome}
        />
        <div className="border-t border-border" />
        <AdminSwitch
          label="Inscripción pública"
          description={
            teamsMissing && !t.publicRegistration
              ? `Crea al menos ${MIN_TEAMS_FOR_TEAM_TOURNAMENT} equipos para habilitarla.`
              : `Habilita el formulario en /inscripcion/${t.slug}. Requiere mostrarlo en el home.`
          }
          checked={t.publicRegistration}
          disabled={
            isFinished || isLoading('save:visibility') || (teamsMissing && !t.publicRegistration)
          }
          onChange={setPublicRegistration}
        />
        <FieldStatus field="visibility" />

        <div className="border-t border-border pt-4">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Estado</span>
            <span className="flex items-center gap-2">
              <FieldStatus field="status" />
              <span className="rounded-full bg-bg px-3 py-1 text-muted">
                Actual: {STATUS_LABELS[t.status] ?? t.status}
              </span>
            </span>
          </span>
          {isFinished ? (
            <p className="mt-2 text-sm text-finished">
              Torneo archivado. Los datos están protegidos contra reinicios y edición de rondas.
            </p>
          ) : (
            <>
              <AdminPillGroup
                label="Estado de inscripciones"
                className="mt-2"
                value={t.status}
                disabled={isLoading('save:status')}
                onChange={setStatus}
                options={[
                  {
                    value: 'registration_open',
                    label: 'Inscripciones abiertas',
                    disabled: teamsMissing && t.status !== 'registration_open',
                  },
                  { value: 'registration_closed', label: 'Inscripciones cerradas' },
                ]}
              />
              {teamsMissing && (
                <p className="mt-2 text-xs text-pending">
                  Faltan equipos: tienes {teamCount} de {MIN_TEAMS_FOR_TEAM_TOURNAMENT} mínimos para
                  abrir inscripciones.
                </p>
              )}
            </>
          )}
        </div>
      </AdminFormSection>

      <AdminTournamentPublicLinks slug={t.slug} status={t.status} />

      <AdminFormSection
        title="Exportar datos"
        description="Descarga clasificación, partidas y jugadores (con contacto) en un archivo ZIP."
      >
        <div>
          <AdminButton variant="secondary" loading={isLoading('export')} onClick={exportData}>
            Exportar CSV (ZIP)
          </AdminButton>
        </div>
      </AdminFormSection>

      {!isFinished && (
        <AdminFormSection
          title="Zona de peligro"
          description="Acciones que no se pueden deshacer."
          tone="danger"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Finalizar torneo</p>
              <p className="text-xs text-muted">
                Archiva el torneo, protege los datos y cierra la inscripción pública.
              </p>
            </div>
            <AdminButton
              variant="ghost"
              className="admin-btn-danger-outline shrink-0"
              onClick={() => setFinishModalOpen(true)}
            >
              Finalizar torneo
            </AdminButton>
          </div>
          <div className="border-t border-red-200" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Reiniciar torneo</p>
              <p className="text-xs text-muted">Borra rondas o inscripciones de prueba.</p>
            </div>
            <AdminButton
              variant="danger"
              className="shrink-0"
              onClick={() => setResetModalOpen(true)}
              disabled={resetting}
            >
              Reiniciar torneo
            </AdminButton>
          </div>
        </AdminFormSection>
      )}

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

      <AdminConfirmDialog
        open={finishModalOpen}
        title="Finalizar torneo"
        description="¿Marcar el torneo como finalizado? Los datos quedarán protegidos y la web mostrará el archivo público. La inscripción pública se desactivará automáticamente."
        confirmLabel="Finalizar"
        confirmVariant="danger"
        loading={isLoading('save:status')}
        onCancel={() => setFinishModalOpen(false)}
        onConfirm={async () => {
          if (await save({ status: 'finished' }, 'status', false)) setFinishModalOpen(false);
        }}
      />

      <AdminConfirmDialog
        open={disableTeamsModalOpen}
        title="Desactivar modo por equipos"
        description="Se eliminarán los equipos y las asignaciones de jugadores. Esta acción no se puede deshacer."
        confirmLabel="Desactivar"
        confirmVariant="danger"
        loading={isLoading('save:isTeamTournament')}
        onCancel={() => setDisableTeamsModalOpen(false)}
        onConfirm={confirmDisableTeams}
      />
    </div>
  );
}
