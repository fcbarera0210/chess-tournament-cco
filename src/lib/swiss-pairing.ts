export type PairingPlayer = {
  id: string;
  name: string;
  points: number;
  hadBye: boolean;
  createdAt: Date;
  opponentIds: Set<string>;
  whiteGames: number;
  blackGames: number;
};

export type GeneratedPairing = {
  boardNumber: number;
  whitePlayerId: string;
  blackPlayerId: string | null;
  isBye: boolean;
};

export type SwissPairingResult = {
  pairings: GeneratedPairing[];
  warnings: string[];
  byePlayerId: string | null;
};

function compareByeCandidate(a: PairingPlayer, b: PairingPlayer): number {
  if (a.points !== b.points) return a.points - b.points;
  if (a.hadBye !== b.hadBye) return a.hadBye ? 1 : -1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function assignColors(a: PairingPlayer, b: PairingPlayer): { whiteId: string; blackId: string } {
  if (a.whiteGames !== b.whiteGames) {
    return a.whiteGames < b.whiteGames
      ? { whiteId: a.id, blackId: b.id }
      : { whiteId: b.id, blackId: a.id };
  }
  if (a.blackGames !== b.blackGames) {
    return a.blackGames > b.blackGames
      ? { whiteId: a.id, blackId: b.id }
      : { whiteId: b.id, blackId: a.id };
  }
  return a.createdAt.getTime() <= b.createdAt.getTime()
    ? { whiteId: a.id, blackId: b.id }
    : { whiteId: b.id, blackId: a.id };
}

function selectByePlayer(players: PairingPlayer[]): PairingPlayer | null {
  if (players.length % 2 === 0) return null;
  const eligible = [...players].filter((p) => !p.hadBye).sort(compareByeCandidate);
  if (eligible.length > 0) return eligible[0];
  return [...players].sort(compareByeCandidate)[0] ?? null;
}

function pairRoundOne(players: PairingPlayer[], random: () => number): [PairingPlayer, PairingPlayer][] {
  const shuffled = shuffle(players, random);
  const pairs: [PairingPlayer, PairingPlayer][] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

function pairScoreGroups(players: PairingPlayer[], warnings: string[]): [PairingPlayer, PairingPlayer][] {
  const sorted = [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const groups = new Map<number, PairingPlayer[]>();
  for (const player of sorted) {
    const group = groups.get(player.points) ?? [];
    group.push(player);
    groups.set(player.points, group);
  }

  const scoreKeys = [...groups.keys()].sort((a, b) => b - a);
  let floaters: PairingPlayer[] = [];
  const pairs: [PairingPlayer, PairingPlayer][] = [];

  for (const score of scoreKeys) {
    let group = [...(groups.get(score) ?? []), ...floaters];
    floaters = [];

    while (group.length > 0) {
      if (group.length === 1) {
        floaters.push(group[0]);
        break;
      }

      const current = group.shift()!;
      const partnerIndex = group.findIndex((candidate) => !current.opponentIds.has(candidate.id));

      if (partnerIndex === -1) {
        floaters.push(current);
        continue;
      }

      const partner = group.splice(partnerIndex, 1)[0];
      pairs.push([current, partner]);
    }
  }

  if (floaters.length > 0) {
    while (floaters.length >= 2) {
      const current = floaters.shift()!;
      const partnerIndex = floaters.findIndex((candidate) => !current.opponentIds.has(candidate.id));

      if (partnerIndex === -1) {
        warnings.push(
          `Rematch forzado: ${current.name} vs ${floaters[0].name} (sin pareja alternativa)`,
        );
        const partner = floaters.shift()!;
        pairs.push([current, partner]);
        continue;
      }

      const partner = floaters.splice(partnerIndex, 1)[0];
      pairs.push([current, partner]);
    }

    if (floaters.length === 1) {
      warnings.push(`${floaters[0].name} quedó sin pareja; revisa manualmente`);
    }
  }

  return pairs;
}

export function generateSwissPairings(
  players: PairingPlayer[],
  roundNumber: number,
  random: () => number = Math.random,
): SwissPairingResult {
  const warnings: string[] = [];

  if (players.length < 2) {
    return {
      pairings: [],
      warnings: ['Se necesitan al menos 2 jugadores con check-in'],
      byePlayerId: null,
    };
  }

  const byePlayer = selectByePlayer(players);
  const pool = byePlayer ? players.filter((p) => p.id !== byePlayer.id) : [...players];
  const pairings: GeneratedPairing[] = [];
  let byePlayerId: string | null = null;

  if (byePlayer) {
    byePlayerId = byePlayer.id;
    pairings.push({
      boardNumber: 0,
      whitePlayerId: byePlayer.id,
      blackPlayerId: null,
      isBye: true,
    });
  }

  const matchedPairs =
    roundNumber === 1 ? pairRoundOne(pool, random) : pairScoreGroups(pool, warnings);

  for (const [a, b] of matchedPairs) {
    const { whiteId, blackId } = assignColors(a, b);
    pairings.push({
      boardNumber: 0,
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      isBye: false,
    });
  }

  const pairedIds = new Set<string>();
  for (const pairing of pairings) {
    pairedIds.add(pairing.whitePlayerId);
    if (pairing.blackPlayerId) pairedIds.add(pairing.blackPlayerId);
  }

  if (pairedIds.size !== players.length) {
    warnings.push('El pareo automático no cubrió a todos los jugadores; revisa manualmente');
  }

  pairings.forEach((pairing, index) => {
    pairing.boardNumber = index + 1;
  });

  return { pairings, warnings, byePlayerId };
}
