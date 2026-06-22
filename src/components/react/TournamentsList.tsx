import { useEffect, useState } from 'react';
import { AdminTournamentPublicLinks } from './AdminTournamentPublicLinks';

type Tournament = {
  id: string;
  name: string;
  slug: string;
  eventDate: string;
  status: string;
  showOnHome: boolean;
  publicRegistration: boolean;
};

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  registration_open: 'Inscripciones abiertas',
  registration_closed: 'Inscripciones cerradas',
  live: 'En juego',
  finished: 'Finalizado',
};

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TournamentsList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tournaments')
      .then((r) => r.json())
      .then((data) => setTournaments(data.tournaments ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Cargando torneos…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Torneos</h1>
          <p className="mt-1 text-muted">Gestiona todos los eventos de la plataforma.</p>
        </div>
        <a href="/admin/torneos/nuevo" className="admin-btn admin-btn-primary">
          + Nuevo torneo
        </a>
      </div>

      {tournaments.length === 0 ? (
        <div className="admin-card p-8 text-center text-muted">
          <p>No hay torneos creados.</p>
          <a href="/admin/torneos/nuevo" className="admin-btn admin-btn-primary mt-4 inline-block">
            Crear el primero
          </a>
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Visibilidad</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{formatDate(t.eventDate)}</td>
                  <td className="px-4 py-3">{statusLabel[t.status] ?? t.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.showOnHome && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          Home
                        </span>
                      )}
                      {t.publicRegistration && (
                        <span className="rounded-full bg-finished/10 px-2 py-0.5 text-xs font-medium text-finished">
                          Inscripción
                        </span>
                      )}
                      {!t.showOnHome && !t.publicRegistration && (
                        <span className="text-xs text-muted">Interno</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <a href={`/admin/torneo?tournamentId=${t.id}`} className="text-sm font-medium hover:underline">
                        Config
                      </a>
                      <AdminTournamentPublicLinks slug={t.slug} status={t.status} variant="inline" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
