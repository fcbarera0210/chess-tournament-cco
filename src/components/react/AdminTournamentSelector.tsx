import { useEffect, useState } from 'react';
import { useAdminTournament } from '../../hooks/useAdminTournament';

type TournamentOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  registration_open: 'Inscripciones',
  registration_closed: 'Cerradas',
  live: 'En juego',
  finished: 'Finalizado',
};

export function AdminTournamentSelector() {
  const { tournamentId, tournament, loading, selectTournament } = useAdminTournament();
  const [options, setOptions] = useState<TournamentOption[]>([]);

  useEffect(() => {
    fetch('/api/tournaments')
      .then((r) => r.json())
      .then((data) => setOptions(data.tournaments ?? []))
      .catch(() => setOptions([]));
  }, []);

  if (loading) {
    return <span className="text-sm text-white/50">Torneo…</span>;
  }

  if (options.length === 0) {
    return (
      <a href="/admin/torneos/nuevo" className="admin-nav-link text-sm">
        Crear torneo
      </a>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-white/80">
      <span className="hidden md:inline">Torneo:</span>
      <select
        value={tournamentId ?? ''}
        onChange={(e) => selectTournament(e.target.value)}
        className="max-w-[12rem] truncate rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
        aria-label="Seleccionar torneo activo"
      >
        {options.map((t) => (
          <option key={t.id} value={t.id} className="text-ink">
            {t.name} ({statusLabel[t.status] ?? t.status})
          </option>
        ))}
      </select>
      {tournament && (
        <span className="hidden text-xs text-white/40 lg:inline">{tournament.slug}</span>
      )}
    </label>
  );
}
