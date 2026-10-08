export type PairingPlayer = {
  id: string;
  name: string;
  points: number;
  hadBye: boolean;
  createdAt: Date;
  opponentIds: Set<string>;
  whiteGames: number;
  blackGames: number;
  teamId?: string | null;
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

function areTeammates(a: PairingPlayer, b: PairingPlayer): boolean {
  return Boolean(a.teamId && b.teamId && a.teamId === b.teamId);
}

function isEligiblePartner(
  current: PairingPlayer,
  candidate: PairingPlayer,
  allowRematch: boolean,
): boolean {
  if (areTeammates(current, candidate)) return false;
  if (!allowRematch && current.opponentIds.has(candidate.id)) return false;
  return true;
}

function findPartnerIndex(
  current: PairingPlayer,
  candidates: PairingPlayer[],
  allowRematch: boolean,
): number {
  const fresh = candidates.findIndex(
    (candidate) => isEligiblePartner(current, candidate, false),
  );
  if (fresh !== -1) return fresh;
  if (!allowRematch) return -1;
  return candidates.findIndex((candidate) => isEligiblePartner(current, candidate, true));
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

function pairRoundOne(
  players: PairingPlayer[],
  random: () => number,
  warnings: string[],
): [PairingPlayer, PairingPlayer][] {
  const maxAttempts = 48;
  let bestPairs: [PairingPlayer, PairingPlayer][] = [];
  let bestUnpaired = players.length;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remaining = shuffle(players, random);
    const pairs: [PairingPlayer, PairingPlayer][] = [];
    const unpaired: PairingPlayer[] = [];

    while (remaining.length > 0) {
      const current = remaining.shift()!;
      const partnerIndex = findPartnerIndex(current, remaining, true);
      if (partnerIndex === -1) {
        unpaired.push(current);
        continue;
      }
      const partner = remaining.splice(partnerIndex, 1)[0];
      pairs.push([current, partner]);
    }

    if (unpaired.length < bestUnpaired) {
      bestUnpaired = unpaired.length;
      bestPairs = pairs;
    }

    if (unpaired.length === 0) {
      return pairs;
    }
  }

  if (bestUnpaired > 0) {
    warnings.push(
      `${bestUnpaired} jugador(es) sin rival de otro equipo en ronda 1; revisa o ajusta equipos`,
    );
  }

  return bestPairs;
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
      const partnerIndex = findPartnerIndex(current, group, false);

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
      // Emparejar primero a quien tiene menos rivales válidos.
      let hardestIdx = 0;
      let hardestCount = Infinity;
      for (let i = 0; i < floaters.length; i += 1) {
        const count = floaters.filter(
          (candidate, j) => j !== i && isEligiblePartner(floaters[i], candidate, true),
        ).length;
        if (count < hardestCount) {
          hardestCount = count;
          hardestIdx = i;
        }
      }

      const current = floaters.splice(hardestIdx, 1)[0];
      const partnerIndex = findPartnerIndex(current, floaters, true);

      if (partnerIndex === -1) {
        warnings.push(
          `${current.name} no tiene rival de otro equipo disponible; revisa manualmente`,
        );
        continue;
      }

      const partner = floaters.splice(partnerIndex, 1)[0];
      if (current.opponentIds.has(partner.id)) {
        warnings.push(
          `Rematch forzado: ${current.name} vs ${partner.name} (sin pareja alternativa)`,
        );
      }
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
    roundNumber === 1
      ? pairRoundOne(pool, random, warnings)
      : pairScoreGroups(pool, warnings);

  const byId = new Map(players.map((p) => [p.id, p]));

  for (const [a, b] of matchedPairs) {
    if (areTeammates(a, b)) {
      warnings.push(`Se evitó un pareo inválido entre compañeros: ${a.name} vs ${b.name}`);
      continue;
    }
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

    if (pairing.blackPlayerId) {
      const white = byId.get(pairing.whitePlayerId);
      const black = byId.get(pairing.blackPlayerId);
      if (white && black && areTeammates(white, black)) {
        warnings.push(
          `Pareo entre compañeros detectado: ${white.name} vs ${black.name}`,
        );
      }
    }
  }

  if (pairedIds.size !== players.length) {
    warnings.push('El pareo automático no cubrió a todos los jugadores; revisa manualmente');
  }

  pairings.forEach((pairing, index) => {
    pairing.boardNumber = index + 1;
  });

  return { pairings, warnings, byePlayerId };
}
