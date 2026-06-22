import { and, eq, ne } from 'drizzle-orm';
import { db } from './db';
import { tournaments } from './db/schema';

export async function findConflictingFeaturedRegistration(
  tournamentId: string | null,
): Promise<{ id: string; name: string; slug: string } | null> {
  const conditions = [
    eq(tournaments.showOnHome, true),
    eq(tournaments.status, 'registration_open'),
  ];
  if (tournamentId) {
    conditions.push(ne(tournaments.id, tournamentId));
  }

  const [conflict] = await db
    .select({ id: tournaments.id, name: tournaments.name, slug: tournaments.slug })
    .from(tournaments)
    .where(and(...conditions))
    .limit(1);

  return conflict ?? null;
}

export function validateTournamentFlags(input: {
  showOnHome?: boolean;
  publicRegistration?: boolean;
  status?: string;
}): string | null {
  if (input.publicRegistration && !input.showOnHome) {
    return 'La inscripción pública requiere que el torneo se muestre en el home';
  }
  if (input.publicRegistration && input.status === 'finished') {
    return 'Un torneo finalizado no puede tener inscripción pública';
  }
  return null;
}
