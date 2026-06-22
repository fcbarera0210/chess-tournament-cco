import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { zipSync, strToU8 } from 'fflate';
import { db } from '../../../lib/db';
import { players } from '../../../lib/db/schema';
import { requireAdminTournament } from '../../../lib/admin-tournament-context';
import { buildTournamentArchive } from '../../../lib/tournament-archive';
import { withAdmin } from '../../../lib/session';

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
      .select()
      .from(players)
      .where(eq(players.tournamentId, tournament.id));

    const clasificacionCsv = toCsv(
      ['posicion', 'nombre', 'puntos', 'buchholz', 'pj', 'g', 'e', 'p'],
      archive.standings.map((s, i) => [
        i + 1,
        s.name,
        s.points,
        s.buchholzCut1,
        s.gamesPlayed,
        s.wins,
        s.draws,
        s.losses,
      ]),
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
      ['nombre', 'contacto', 'club_nivel', 'estado'],
      playerRows.map((p) => [p.name, p.contact, p.clubLevel ?? '', p.status]),
    );

    const zipped = zipSync({
      'clasificacion.csv': strToU8(clasificacionCsv),
      'partidas.csv': strToU8(partidasCsv),
      'jugadores.csv': strToU8(jugadoresCsv),
    });

    const filename = `${tournament.slug}-export.zip`;

    return new Response(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });
