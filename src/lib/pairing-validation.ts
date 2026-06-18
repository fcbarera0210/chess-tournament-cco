export type PairingInput = {
  whitePlayerId?: string | null;
  blackPlayerId?: string | null;
  isBye?: boolean;
};

export function validatePairings(
  pairings: PairingInput[],
  checkedInIds: string[],
): { valid: boolean; error?: string } {
  if (checkedInIds.length < 2) {
    return { valid: false, error: 'Se necesitan al menos 2 jugadores con check-in' };
  }

  const checkedInSet = new Set(checkedInIds);
  const assigned = new Map<string, number>();
  let byeCount = 0;

  for (const pairing of pairings) {
    const isBye = pairing.isBye === true;
    const whiteId = pairing.whitePlayerId ?? null;
    const blackId = pairing.blackPlayerId ?? null;

    if (isBye) {
      byeCount += 1;
      if (!whiteId) {
        return { valid: false, error: 'El bye debe tener un jugador asignado' };
      }
      if (blackId) {
        return { valid: false, error: 'El bye no debe tener jugador en negras' };
      }
      assigned.set(whiteId, (assigned.get(whiteId) ?? 0) + 1);
      continue;
    }

    if (!whiteId || !blackId) {
      return { valid: false, error: 'Cada mesa debe tener jugador en blancas y negras' };
    }
    if (whiteId === blackId) {
      return { valid: false, error: 'Un jugador no puede emparejarse consigo mismo' };
    }
    if (!checkedInSet.has(whiteId) || !checkedInSet.has(blackId)) {
      return { valid: false, error: 'Hay jugadores que no tienen check-in' };
    }

    assigned.set(whiteId, (assigned.get(whiteId) ?? 0) + 1);
    assigned.set(blackId, (assigned.get(blackId) ?? 0) + 1);
  }

  if (byeCount > 1) {
    return { valid: false, error: 'Solo puede haber un bye por ronda' };
  }

  const isOdd = checkedInIds.length % 2 === 1;
  if (isOdd && byeCount !== 1) {
    return {
      valid: false,
      error: 'Con número impar de jugadores debe haber exactamente un bye (+1 pt)',
    };
  }
  if (!isOdd && byeCount > 0) {
    return { valid: false, error: 'No debe haber bye cuando hay número par de jugadores' };
  }

  for (const id of checkedInIds) {
    const count = assigned.get(id) ?? 0;
    if (count === 0) {
      return { valid: false, error: 'Falta asignar a algún jugador con check-in' };
    }
    if (count > 1) {
      return { valid: false, error: 'Un jugador aparece en más de una mesa' };
    }
  }

  for (const [playerId] of assigned) {
    if (!checkedInSet.has(playerId)) {
      return { valid: false, error: 'Hay jugadores inválidos en el pareo' };
    }
  }

  return { valid: true };
}
