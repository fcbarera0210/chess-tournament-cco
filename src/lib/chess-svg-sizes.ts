/** Intrinsic dimensions from SVG viewBox (width × height). */
export const CHESS_SVG_SIZE = {
  'b-queen': { width: 22, height: 62 },
  'b-king': { width: 22, height: 73 },
  'b-pawn': { width: 20, height: 43 },
  'b-rook': { width: 35, height: 52 },
  'w-bishop': { width: 23, height: 64 },
  'w-queen': { width: 22, height: 62 },
  'w-king': { width: 22, height: 73 },
  'w-pawn': { width: 20, height: 43 },
  'w-knight-front': { width: 26, height: 48 },
  'l-timer': { width: 62, height: 70 },
  'r-timer': { width: 62, height: 70 },
  'close-chessboard': { width: 120, height: 86 },
  'chess-set': { width: 120, height: 87 },
} as const;

export type ChessSvgName = keyof typeof CHESS_SVG_SIZE;

export function chessSvgSrc(name: ChessSvgName): string {
  return `/images/chess/${name}.svg`;
}
