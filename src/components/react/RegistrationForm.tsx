import { useEffect, useState } from 'react';
import { publicApiUrl } from '../../lib/admin-api';
import { AdminPillGroup } from './AdminPillGroup';

type TeamOption = { id: string; name: string };

type Props = {
  slug: string;
  eventDate: string;
  venue: string;
  isTeamTournament?: boolean;
};

export function RegistrationForm({ slug, eventDate, venue, isTeamTournament = false }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [clubLevel, setClubLevel] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(isTeamTournament);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ status: string; name: string } | null>(null);

  useEffect(() => {
    if (!isTeamTournament) return;

    setTeamsLoading(true);
    fetch(publicApiUrl('/api/teams', slug))
      .then((r) => r.json())
      .then((data) => {
        setTeams(data.teams ?? []);
      })
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, [isTeamTournament, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (isTeamTournament && !teamId) {
      setError('Elige tu equipo para completar la inscripción.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(publicApiUrl('/api/registrations', slug), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact,
          clubLevel,
          confirmed,
          ...(isTeamTournament ? { teamId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al inscribirse');
        return;
      }

      setSuccess({ status: data.status, name: data.player.name });
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-finished/10 text-3xl text-finished">
          ✓
        </div>
        <h2 className="font-display text-2xl font-bold">¡Listo, {success.name}!</h2>
        <p className="mt-3 text-muted">
          {success.status === 'waitlist'
            ? 'Quedaste en lista de espera. Te contactaremos si se libera un cupo.'
            : 'Tu inscripción fue registrada correctamente.'}
        </p>
        <p className="mt-4 text-sm text-muted">
          Te esperamos el {eventDate} en {venue}.
        </p>
        <a href={`/clasificacion/${slug}`} className="btn-pill btn-pill-primary mt-8 inline-flex">
          Ver estado del torneo
        </a>
      </div>
    );
  }

  const teamsReady = !isTeamTournament || teams.length >= 2;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Completa tu inscripción</h2>
        <p className="mt-1 text-sm text-muted">Todos los campos marcados son obligatorios.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </div>
      )}

      {isTeamTournament && !teamsLoading && !teamsReady && (
        <div className="rounded-lg border border-pending/30 bg-pending/10 px-4 py-3 text-sm text-pending">
          Las inscripciones por equipos aún no están listas. El organizador debe crear al menos dos
          equipos.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-muted" htmlFor="name">
          Nombre completo
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-minimal"
          placeholder="Tu nombre"
          disabled={!teamsReady}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted" htmlFor="contact">
          Contacto (email o teléfono)
        </label>
        <input
          id="contact"
          type="text"
          required
          minLength={5}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="input-minimal"
          placeholder="correo@ejemplo.com o +56 9 ..."
          disabled={!teamsReady}
        />
      </div>

      {isTeamTournament && (
        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Elige tu equipo</span>
          {teamsLoading ? (
            <p className="text-sm text-muted">Cargando equipos...</p>
          ) : (
            <AdminPillGroup
              label="Equipo"
              value={teamId}
              disabled={!teamsReady}
              onChange={(value) => {
                setTeamId(value);
                setError('');
              }}
              options={teams.map((team) => ({ value: team.id, label: team.name }))}
            />
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-muted" htmlFor="club">
          ¿Club o nivel? (opcional)
        </label>
        <input
          id="club"
          type="text"
          value={clubLevel}
          onChange={(e) => setClubLevel(e.target.value)}
          className="input-minimal"
          placeholder="Principiante, club local, Elo ~1200..."
          disabled={!teamsReady}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-ink"
          required
          disabled={!teamsReady}
        />
        <span>
          Confirmo que puedo asistir el {eventDate} en {venue} y acepto las{' '}
          <a href="/bases" className="font-semibold text-ink underline-offset-2 hover:underline">
            bases del torneo
          </a>{' '}
          y el uso de mis datos personales según se describe allí.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !teamsReady}
        className="btn-pill btn-pill-primary w-full py-4 disabled:opacity-60"
      >
        {loading ? 'Enviando...' : 'Enviar inscripción'}
      </button>
    </form>
  );
}
