import { useEffect, useState } from 'react';
import { useAdminTournament } from '../../hooks/useAdminTournament';
import { adminApiUrl, publicApiUrl } from '../../lib/admin-api';
import { getTournamentPublicLinks } from '../../lib/tournament-public-links';

export function AdminDashboard() {
  const { tournamentId, tournament: ctxTournament } = useAdminTournament();
  const [data, setData] = useState<{
    tournament: { name: string; status: string; slug: string };
    stats: { registered: number; waitlist: number; checkedIn: number };
  } | null>(null);
  const [round, setRound] = useState<{ roundNumber: number; pendingGames: number } | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    fetch(adminApiUrl('/api/tournament', tournamentId))
      .then((r) => r.json())
      .then(setData);

    if (ctxTournament?.slug) {
      fetch(publicApiUrl('/api/live', ctxTournament.slug))
        .then((r) => r.json())
        .then((d) => {
          if (d.round) {
            setRound({ roundNumber: d.round.roundNumber, pendingGames: d.round.pendingGames });
          } else {
            setRound(null);
          }
        });
    }
  }, [tournamentId, ctxTournament?.slug]);

  if (!data) return <p className="text-muted">Cargando...</p>;

  const statusLabel: Record<string, string> = {
    registration_open: 'Inscripciones abiertas',
    registration_closed: 'Inscripciones cerradas',
    live: 'En juego',
    finished: 'Finalizado',
  };

  const slug = data.tournament.slug;
  const publicLinks = getTournamentPublicLinks(slug, data.tournament.status);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">{data.tournament.name}</h1>
        <p className="mt-1 text-muted">
          {statusLabel[data.tournament.status] ?? data.tournament.status}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="admin-card p-5 text-center">
          <p className="admin-stat-value">{data.stats.registered}</p>
          <p className="mt-2 text-sm text-muted">Inscritos</p>
        </div>
        <div className="admin-card p-5 text-center">
          <p className="admin-stat-value">{data.stats.checkedIn}</p>
          <p className="mt-2 text-sm text-muted">Check-in</p>
        </div>
        <div className="admin-card p-5 text-center">
          <p className="admin-stat-value">{round?.roundNumber ?? '—'}</p>
          <p className="mt-2 text-sm text-muted">Ronda actual</p>
        </div>
      </div>

      {round && round.pendingGames > 0 && (
        <div className="rounded-xl border border-pending/30 bg-pending/10 px-4 py-3 text-sm font-medium text-pending">
          {round.pendingGames} partidas sin resultado en ronda {round.roundNumber}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: '/admin/jugadores', label: 'Gestionar jugadores' },
          { href: '/admin/rondas', label: 'Ver rondas' },
          { href: '/admin/galeria', label: 'Galería de fotos' },
          { href: '/admin/torneo', label: 'Configuración y export' },
          ...publicLinks.map((link) => ({ href: link.href, label: link.label, external: true })),
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            target={'external' in link && link.external ? '_blank' : undefined}
            rel={'external' in link && link.external ? 'noopener noreferrer' : undefined}
            className="admin-card flex items-center justify-between p-4 font-medium transition hover:bg-bg"
          >
            {link.label}
            <span className="text-muted">{'external' in link && link.external ? '↗' : '→'}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
