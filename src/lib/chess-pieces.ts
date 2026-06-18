export const PIECE_TYPES = [
  'pawn',
  'knight-front',
  'bishop',
  'rook',
  'queen',
  'king',
] as const;

export type PieceColor = 'w' | 'b';

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pieceSrc(color: PieceColor, seed: string): string {
  const piece = PIECE_TYPES[hashSeed(seed) % PIECE_TYPES.length];
  return `/images/chess/${color}-${piece}.svg`;
}

export function resultWinnerColors(
  result: string,
  whiteName: string | null,
  blackName: string | null,
): PieceColor[] {
  switch (result) {
    case 'white':
    case 'forfeit_black':
      return ['w'];
    case 'black':
    case 'forfeit_white':
      return ['b'];
    case 'draw':
      return ['w', 'b'];
    case 'bye':
      return whiteName != null ? ['w'] : ['b'];
    default:
      return [];
  }
}
