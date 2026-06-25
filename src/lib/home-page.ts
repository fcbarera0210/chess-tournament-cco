import { eq, desc } from 'drizzle-orm';
import { db } from './db';
import { tournaments } from './db/schema';
import {
  getFeaturedTournament,
  getPublicArchiveTournaments,
  getRegistrationStatsBatch,
  isRegistrationOpen,
  type RegistrationStats,
} from './tournament';

type Tournament = typeof tournaments.$inferSelect;

export type HomePageData = {
  featured: Tournament | null;
  primaryArchive: Tournament | null;
  archives: Tournament[];
  otherArchives: Tournament[];
  navTournament: Tournament | null;
  featuredStats: RegistrationStats | null;
  featuredSpotsInfo: FeaturedSpotsInfo | null;
  archiveStatsEntries: { tournament: Tournament; stats: RegistrationStats }[];
  primaryArchiveStats: RegistrationStats | null;
  isArchiveHome: boolean;
};

export type FeaturedSpotsInfo = {
  registered: number;
  maxPlayers: number;
  registrationOpen: boolean;
  waitlistAvailable: boolean;
};

async function getFinishedFallbackArchive(excludeId?: string): Promise<Tournament | null> {
  const [fallback] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, 'finished'))
    .orderBy(desc(tournaments.eventDate))
    .limit(1);

  if (!fallback || fallback.id === excludeId) return null;
  return fallback;
}

function buildFeaturedSpotsInfo(
  tournament: Tournament,
  stats: RegistrationStats,
): FeaturedSpotsInfo {
  return {
    registered: stats.registered,
    maxPlayers: tournament.maxPlayers,
    registrationOpen: isRegistrationOpen(tournament, stats.registered),
    waitlistAvailable:
      tournament.waitlistEnabled &&
      tournament.status === 'registration_open' &&
      stats.registered >= tournament.maxPlayers,
  };
}

export async function loadHomePageData(): Promise<HomePageData> {
  const [featured, publicArchives] = await Promise.all([
    getFeaturedTournament(),
    getPublicArchiveTournaments(),
  ]);

  let archives = publicArchives;
  if (featured && archives.length === 0) {
    const fallback = await getFinishedFallbackArchive(featured.id);
    if (fallback) archives = [fallback];
  }

  const primaryArchive = featured ? null : (archives[0] ?? (await getFinishedFallbackArchive()));

  const otherArchives = primaryArchive
    ? archives.filter((a) => a.id !== primaryArchive.id)
    : archives;

  const statsIds = new Set<string>();
  if (featured) statsIds.add(featured.id);
  if (primaryArchive) statsIds.add(primaryArchive.id);
  for (const archive of archives) statsIds.add(archive.id);

  const statsMap = await getRegistrationStatsBatch([...statsIds]);

  const featuredStats = featured ? (statsMap.get(featured.id) ?? null) : null;
  const primaryArchiveStats = primaryArchive ? (statsMap.get(primaryArchive.id) ?? null) : null;

  const archiveStatsEntries =
    featured && archives.length > 0
      ? archives.map((tournament) => ({
          tournament,
          stats: statsMap.get(tournament.id) ?? { registered: 0, waitlist: 0, checkedIn: 0 },
        }))
      : [];

  const featuredSpotsInfo =
    featured && featuredStats ? buildFeaturedSpotsInfo(featured, featuredStats) : null;

  return {
    featured,
    primaryArchive,
    archives,
    otherArchives,
    navTournament: featured ?? primaryArchive,
    featuredStats,
    featuredSpotsInfo,
    archiveStatsEntries,
    primaryArchiveStats,
    isArchiveHome: !featured && !!primaryArchive,
  };
}
