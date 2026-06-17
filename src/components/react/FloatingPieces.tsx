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
    src: '/images/chess/b-queen.svg',
    className: 'float-piece absolute -left-4 top-8 h-24 w-auto md:h-32',
    width: 124,
    height: 125,
  },
  {
    src: '/images/chess/w-knight-front.svg',
    className: 'float-piece-delayed absolute right-4 top-12 h-20 w-auto blur-[1px] md:h-28',
    width: 105,
    height: 96,
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
