import { useEffect, useState } from 'react';

export function AdminDashboard() {
  const [data, setData] = useState<{
    tournament: { name: string; status: string };
    stats: { registered: number; waitlist: number; checkedIn: number };
  } | null>(null);
  const [round, setRound] = useState<{ roundNumber: number; pendingGames: number } | null>(null);

  useEffect(() => {
    fetch('/api/tournament')
      .then((r) => r.json())
      .then(setData);
    fetch('/api/live')
      .then((r) => r.json())
      .then((d) => {
        if (d.round) {
          setRound({ roundNumber: d.round.roundNumber, pendingGames: d.round.pendingGames });
        }
      });
  }, []);

  if (!data) return <p className="text-muted">Cargando...</p>;

  const statusLabel: Record<string, string> = {
    registration_open: 'Inscripciones abiertas',
    registration_closed: 'Inscripciones cerradas',
    live: 'En juego',
    finished: 'Finalizado',
  };

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
          { href: '/live', label: 'Monitoreo live' },
          { href: '/kiosk', label: 'Vista kiosk' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="admin-card flex items-center justify-between p-4 font-medium transition hover:bg-bg"
          >
            {link.label}
            <span className="text-muted">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
