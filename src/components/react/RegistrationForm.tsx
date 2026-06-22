import { useState } from 'react';
import { publicApiUrl } from '../../lib/admin-api';

type Props = {
  slug: string;
  eventDate: string;
  venue: string;
};

export function RegistrationForm({ slug, eventDate, venue }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [clubLevel, setClubLevel] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ status: string; name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(publicApiUrl('/api/registrations', slug), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, clubLevel, confirmed }),
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
        <a href="/clasificacion" className="btn-pill btn-pill-primary mt-8 inline-flex">
          Ver estado del torneo
        </a>
      </div>
    );
  }

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
        />
      </div>

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
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-ink"
          required
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
        disabled={loading}
        className="btn-pill btn-pill-primary w-full py-4 disabled:opacity-60"
      >
        {loading ? 'Enviando...' : 'Enviar inscripción'}
      </button>
    </form>
  );
}
