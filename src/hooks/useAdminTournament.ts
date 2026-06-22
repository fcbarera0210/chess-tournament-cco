import { useCallback, useEffect, useState } from 'react';

type AdminTournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export function useAdminTournament() {
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<AdminTournament | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/tournament-context');
    if (!res.ok) {
      setTournamentId(null);
      setTournament(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTournamentId(data.tournamentId);
    setTournament(data.tournament);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function selectTournament(id: string) {
    const res = await fetch('/api/admin/tournament-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId: id }),
    });
    if (res.ok) await refresh();
  }

  return { tournamentId, tournament, loading, refresh, selectTournament };
}
