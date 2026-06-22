import { useEffect, useState } from 'react';
import { publicApiUrl } from '../../lib/admin-api';

type RegistrationInfo = {
  error?: string;
  stats?: { registered: number; waitlist: number };
  spotsRemaining?: number;
  registrationOpen?: boolean;
  waitlistAvailable?: boolean;
  tournament?: {
    maxPlayers: number;
    eventDate: string;
    venue: string;
  };
};

type Props = {
  slug: string;
};

export function SpotsCounter({ slug }: Props) {
  const [info, setInfo] = useState<RegistrationInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(publicApiUrl('/api/registrations', slug))
      .then((r) => {
        if (!r.ok) {
          setError(true);
          return r.json();
        }
        return r.json();
      })
      .then((data) => {
        if (data?.error) {
          setError(true);
        } else {
          setInfo(data);
        }
      })
      .catch(() => setError(true));
  }, [slug]);

  if (!info && !error) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted">
        Cargando cupos...
      </span>
    );
  }

  if (error || info?.error) {
    return (
      <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
        Torneo en configuración
      </span>
    );
  }

  if (info?.registrationOpen && info.tournament) {
    return (
      <span className="inline-flex items-center rounded-full border border-ink/10 bg-ink/5 px-4 py-1.5 text-sm font-semibold text-ink">
        {info.stats!.registered} / {info.tournament.maxPlayers} plazas ocupadas
      </span>
    );
  }

  if (info?.waitlistAvailable) {
    return (
      <span className="inline-flex items-center rounded-full border border-pending/30 bg-pending/10 px-4 py-1.5 text-sm font-semibold text-pending">
        Cupo completo — lista de espera disponible
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted">
      Inscripciones cerradas
    </span>
  );
}
