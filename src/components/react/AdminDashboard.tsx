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

  if (!data) return <p>Cargando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{data.tournament.name}</h1>
      <p className="text-ink/60">Estado: {data.tournament.status}</p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-sand bg-white p-4 text-center">
          <p className="text-3xl font-bold text-teal">{data.stats.registered}</p>
          <p className="text-sm text-ink/60">Inscritos</p>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-4 text-center">
          <p className="text-3xl font-bold text-teal">{data.stats.checkedIn}</p>
          <p className="text-sm text-ink/60">Check-in</p>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-4 text-center">
          <p className="text-3xl font-bold text-teal">{round?.roundNumber ?? '—'}</p>
          <p className="text-sm text-ink/60">Ronda actual</p>
        </div>
      </div>

      {round && round.pendingGames > 0 && (
        <div className="rounded-xl bg-pending/10 px-4 py-3 text-pending">
          {round.pendingGames} partidas sin resultado en ronda {round.roundNumber}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <a href="/admin/jugadores" className="rounded-xl border border-sand bg-white p-4 font-medium hover:bg-cream">
          Gestionar jugadores
        </a>
        <a href="/admin/rondas" className="rounded-xl border border-sand bg-white p-4 font-medium hover:bg-cream">
          Ver rondas
        </a>
        <a href="/live" className="rounded-xl border border-sand bg-white p-4 font-medium hover:bg-cream">
          Monitoreo live
        </a>
        <a href="/kiosk" className="rounded-xl border border-sand bg-white p-4 font-medium hover:bg-cream">
          Vista kiosk
        </a>
      </div>
    </div>
  );
}
