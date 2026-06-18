import type { APIRoute } from 'astro';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../lib/db';
import { rounds, games, players, tournaments } from '../../lib/db/schema';
import { getActiveTournament, getGamesForRound } from '../../lib/tournament';
import { withAdmin } from '../../lib/session';
import { buildPairingContext, getCheckedInPlayerIds } from '../../lib/pairing-context';
import { validatePairings } from '../../lib/pairing-validation';
import { generateSwissPairings } from '../../lib/swiss-pairing';

export const prerender = false;

export const GET: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const list = await db
      .select()
      .from(rounds)
      .where(eq(rounds.tournamentId, tournament.id))
      .orderBy(desc(rounds.roundNumber));

    return new Response(JSON.stringify({ rounds: list }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

export const POST: APIRoute = async ({ request }) =>
  withAdmin(request, async () => {
    const tournament = await getActiveTournament();
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Torneo no encontrado' }), { status: 404 });
    }

    const body = await request.json();
    const { action, roundNumber, pairings, roundId } = body;

    if (action === 'start_tournament') {
      const checkedIn = await db
        .select()
        .from(players)
        .where(and(eq(players.tournamentId, tournament.id), eq(players.status, 'checked_in')));

      if (checkedIn.length < 2) {
        return new Response(JSON.stringify({ error: 'Se necesitan al menos 2 jugadores con check-in' }), {
          status: 400,
        });
      }

      await db
        .update(rounds)
        .set({ status: 'completed' })
        .where(and(eq(rounds.tournamentId, tournament.id), eq(rounds.status, 'active')));

      await db
        .update(tournaments)
        .set({ status: 'live' })
        .where(eq(tournaments.id, tournament.id));

      const [round] = await db
        .insert(rounds)
        .values({
          tournamentId: tournament.id,
          roundNumber: 1,
          status: 'draft',
        })
        .returning();

      return new Response(JSON.stringify({ round, message: 'Torneo iniciado. Crea los emparejamientos de ronda 1.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_round') {
      const existing = await db
        .select()
        .from(rounds)
        .where(eq(rounds.tournamentId, tournament.id))
        .orderBy(desc(rounds.roundNumber))
        .limit(1);

      const last = existing[0];
      if (last && last.status !== 'completed') {
        return new Response(JSON.stringify({ error: 'Completa la ronda actual primero' }), {
          status: 400,
        });
      }

      const nextNumber = last ? last.roundNumber + 1 : 1;

      const [round] = await db
        .insert(rounds)
        .values({
          tournamentId: tournament.id,
          roundNumber: nextNumber,
          status: 'draft',
        })
        .returning();

      return new Response(JSON.stringify({ round }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate_pairings' && roundId) {
      const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
      if (!round || round.status !== 'draft') {
        return new Response(JSON.stringify({ error: 'Ronda no editable' }), { status: 400 });
      }

      if (tournament.format !== 'swiss') {
        return new Response(JSON.stringify({ error: 'El pareo automático solo aplica a torneos suizos' }), {
          status: 400,
        });
      }

      const context = await buildPairingContext(tournament.id, round.roundNumber);
      if (context.checkedInIds.length < 2) {
        return new Response(JSON.stringify({ error: 'Se necesitan al menos 2 jugadores con check-in' }), {
          status: 400,
        });
      }

      const result = generateSwissPairings(context.players, round.roundNumber);

      return new Response(
        JSON.stringify({
          pairings: result.pairings,
          warnings: result.warnings,
          byePlayerId: result.byePlayerId,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'save_pairings' && roundId && Array.isArray(pairings)) {
      const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
      if (!round || round.status !== 'draft') {
        return new Response(JSON.stringify({ error: 'Ronda no editable' }), { status: 400 });
      }

      const checkedInIds = await getCheckedInPlayerIds(tournament.id);
      const validation = validatePairings(pairings, checkedInIds);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error }), { status: 400 });
      }

      await db.delete(games).where(eq(games.roundId, roundId));

      const gameRows = pairings.map(
        (
          p: {
            boardNumber: number;
            whitePlayerId?: string | null;
            blackPlayerId?: string | null;
            isBye?: boolean;
          },
          idx: number,
        ) => ({
          roundId,
          boardNumber: p.boardNumber ?? idx + 1,
          whitePlayerId: p.whitePlayerId ?? null,
          blackPlayerId: p.blackPlayerId ?? null,
          isBye: p.isBye ?? false,
          result: p.isBye ? ('bye' as const) : ('pending' as const),
        }),
      );

      if (gameRows.length > 0) {
        await db.insert(games).values(gameRows);
      }

      const saved = await getGamesForRound(roundId);
      return new Response(JSON.stringify({ games: saved }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'activate_round' && roundId) {
      const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
      if (!round) {
        return new Response(JSON.stringify({ error: 'Ronda no encontrada' }), { status: 404 });
      }

      const roundGames = await getGamesForRound(roundId);
      if (roundGames.length === 0) {
        return new Response(JSON.stringify({ error: 'Agrega emparejamientos primero' }), {
          status: 400,
        });
      }

      await db
        .update(rounds)
        .set({ status: 'completed' })
        .where(and(eq(rounds.tournamentId, tournament.id), eq(rounds.status, 'active')));

      const [activated] = await db
        .update(rounds)
        .set({ status: 'active' })
        .where(eq(rounds.id, roundId))
        .returning();

      return new Response(JSON.stringify({ round: activated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'complete_round' && roundId) {
      const roundGames = await getGamesForRound(roundId);
      const pending = roundGames.filter((g) => g.result === 'pending' && !g.isBye);
      if (pending.length > 0) {
        return new Response(JSON.stringify({ error: 'Hay partidas sin resultado' }), {
          status: 400,
        });
      }

      const [completed] = await db
        .update(rounds)
        .set({ status: 'completed' })
        .where(eq(rounds.id, roundId))
        .returning();

      return new Response(JSON.stringify({ round: completed }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), { status: 400 });
  });
