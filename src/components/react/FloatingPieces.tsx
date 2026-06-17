/**
 * Decorative floating chess pieces wrapper.
 * Respects prefers-reduced-motion via CSS in global.css (.float-piece).
 */
type Piece = {
  src: string;
  className?: string;
  width?: number;
  height?: number;
};

const defaultPieces: Piece[] = [
  {
    src: '/images/chess/piece-queen-black.svg',
    className: 'float-piece absolute -left-4 top-8 h-24 w-24 md:h-32 md:w-32',
    width: 120,
    height: 120,
  },
  {
    src: '/images/chess/piece-knight-white.svg',
    className: 'float-piece-delayed absolute right-4 top-12 h-20 w-20 blur-[1px] md:h-28 md:w-28',
    width: 100,
    height: 100,
  },
];

type Props = {
  pieces?: Piece[];
};

export function FloatingPieces({ pieces = defaultPieces }: Props) {
  return (
    <>
      {pieces.map((p) => (
        <img
          key={p.src}
          src={p.src}
          alt=""
          width={p.width ?? 80}
          height={p.height ?? 80}
          loading="lazy"
          decoding="async"
          className={`pointer-events-none opacity-90 ${p.className ?? ''}`}
          aria-hidden
        />
      ))}
    </>
  );
}
