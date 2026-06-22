import type { tournaments } from './db/schema';
import { canEditFormat } from './tournament';
import {
  findConflictingFeaturedRegistration,
  validateTournamentFlags,
} from './tournament-validation';

type TournamentRow = typeof tournaments.$inferSelect;

export function buildTournamentUpdates(
  body: Record<string, unknown>,
  current: TournamentRow,
): { updates: Partial<typeof tournaments.$inferInsert>; error?: string } {
  const updates: Partial<typeof tournaments.$inferInsert> = {};

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.venue === 'string') updates.venue = body.venue.trim();
  if (typeof body.eventDate === 'string') updates.eventDate = body.eventDate;
  if (typeof body.eventTimeStart === 'string') updates.eventTimeStart = body.eventTimeStart;
  if (typeof body.eventTimeEnd === 'string') updates.eventTimeEnd = body.eventTimeEnd;
  if (typeof body.timeControl === 'string') updates.timeControl = body.timeControl;
  if (typeof body.maxPlayers === 'number') updates.maxPlayers = body.maxPlayers;
  if (typeof body.plannedRounds === 'number') updates.plannedRounds = body.plannedRounds;
  if (typeof body.waitlistEnabled === 'boolean') updates.waitlistEnabled = body.waitlistEnabled;
  if (typeof body.showOnHome === 'boolean') updates.showOnHome = body.showOnHome;
  if (typeof body.publicRegistration === 'boolean') updates.publicRegistration = body.publicRegistration;

  if (body.venueMapsUrl !== undefined) {
    const url = typeof body.venueMapsUrl === 'string' ? body.venueMapsUrl.trim() : '';
    updates.venueMapsUrl = url || null;
  }

  if (body.format && canEditFormat(current)) {
    if (body.format === 'swiss' || body.format === 'knockout') {
      updates.format = body.format;
    }
  }

  if (body.status) {
    const allowed = ['registration_open', 'registration_closed', 'live', 'finished', 'draft'];
    if (allowed.includes(body.status as string)) {
      updates.status = body.status as TournamentRow['status'];
    }
  }

  const merged = { ...current, ...updates };
  const flagError = validateTournamentFlags({
    showOnHome: merged.showOnHome,
    publicRegistration: merged.publicRegistration,
    status: merged.status,
  });
  if (flagError) return { updates, error: flagError };

  return { updates };
}

export async function assertFeaturedRegistrationUnique(
  tournamentId: string,
  merged: Pick<TournamentRow, 'showOnHome' | 'status'>,
): Promise<string | null> {
  if (merged.showOnHome && merged.status === 'registration_open') {
    const conflict = await findConflictingFeaturedRegistration(tournamentId);
    if (conflict) {
      return `Ya hay un torneo destacado con inscripción abierta: ${conflict.name}`;
    }
  }
  return null;
}
