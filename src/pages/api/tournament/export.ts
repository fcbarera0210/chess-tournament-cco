import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { zipSync, strToU8 } from 'fflate';
import { db } from '../../../lib/db';
import { players, teams } from '../../../lib/db/schema';
import { requireAdminTournament } from '../../../lib/admin-tournament-context';
import { buildTournamentArchive } from '../../../lib/tournament-archive';
import { withAdmin } from '../../../lib/session';
import { computeTeamStandings } from '../../../lib/standings';

export const prerender = false;

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','));
  }
  return lines.join('\n');
}

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await requireAdminTournament(request);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const archive = await buildTournamentArchive(tournament.id);

    const playerRows = await db
      .select({
        name: players.name,
        contact: players.contact,
        clubLevel: players.clubLevel,
        status: players.status,
        teamName: teams.name,
      })
      .from(players)
      .leftJoin(teams, eq(players.teamId, teams.id))
      .where(eq(players.tournamentId, tournament.id));

    const clasificacionCsv = toCsv(
      tournament.isTeamTournament
        ? ['posicion', 'nombre', 'equipo', 'puntos', 'buchholz', 'pj', 'g', 'e', 'p']
        : ['posicion', 'nombre', 'puntos', 'buchholz', 'pj', 'g', 'e', 'p'],
      archive.standings.map((s, i) =>
        tournament.isTeamTournament
          ? [
              i + 1,
              s.name,
              s.teamName ?? '',
              s.points,
              s.buchholzCut1,
              s.gamesPlayed,
              s.wins,
              s.draws,
              s.losses,
            ]
          : [
              i + 1,
              s.name,
              s.points,
              s.buchholzCut1,
              s.gamesPlayed,
              s.wins,
              s.draws,
              s.losses,
            ],
      ),
    );

    const partidasCsv = toCsv(
      ['ronda', 'mesa', 'blancas', 'negras', 'resultado', 'bye'],
      archive.rounds.flatMap((round) =>
        round.games.map((g) => [
          round.roundNumber,
          g.boardNumber,
          g.whiteName ?? '',
          g.blackName ?? '',
          g.resultNotation,
          g.isBye ? 'si' : 'no',
        ]),
      ),
    );

    const jugadoresCsv = toCsv(
      tournament.isTeamTournament
        ? ['nombre', 'contacto', 'equipo', 'club_nivel', 'estado']
        : ['nombre', 'contacto', 'club_nivel', 'estado'],
      playerRows.map((p) =>
        tournament.isTeamTournament
          ? [p.name, p.contact, p.teamName ?? '', p.clubLevel ?? '', p.status]
          : [p.name, p.contact, p.clubLevel ?? '', p.status],
      ),
    );

    const zipFiles: Record<string, Uint8Array> = {
      'clasificacion.csv': strToU8(clasificacionCsv),
      'partidas.csv': strToU8(partidasCsv),
      'jugadores.csv': strToU8(jugadoresCsv),
    };

    if (tournament.isTeamTournament) {
      const teamStandings = await computeTeamStandings(tournament.id);
      zipFiles['clasificacion-equipos.csv'] = strToU8(
        toCsv(
          ['posicion', 'equipo', 'puntos', 'buchholz', 'jugadores', 'g', 'e', 'p'],
          teamStandings.map((s, i) => [
            i + 1,
            s.name,
            s.points,
            s.buchholzCut1,
            s.playerCount,
            s.wins,
            s.draws,
            s.losses,
          ]),
        ),
      );
    }

    const zipped = zipSync(zipFiles);

    const filename = `${tournament.slug}-export.zip`;

    return new Response(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });
