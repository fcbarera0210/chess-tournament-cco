/**
 * Decorative floating chess pieces (optional wrapper).
 * Site-wide background uses FloatingPiecesBackground.astro in BaseLayout.
 */
import { CHESS_SVG_SIZE, chessSvgSrc, type ChessSvgName } from '../../lib/chess-svg-sizes';

type Piece = {
  name: ChessSvgName;
  className?: string;
};

const defaultPieces: Piece[] = [
  {
    name: 'b-queen',
    className: 'float-piece absolute -left-4 top-8 h-24 w-auto md:h-32',
  },
  {
    name: 'w-knight-front',
    className: 'float-piece-delayed absolute right-4 top-12 h-20 w-auto md:h-28',
  },
];

type Props = {
  pieces?: Piece[];
};

export function FloatingPieces({ pieces = defaultPieces }: Props) {
  return (
    <>
      {pieces.map((p) => {
        const size = CHESS_SVG_SIZE[p.name];
        return (
          <img
            key={p.name}
            src={chessSvgSrc(p.name)}
            alt=""
            width={size.width}
            height={size.height}
            loading="lazy"
            decoding="async"
            className={`pointer-events-none opacity-90 ${p.className ?? ''}`}
            aria-hidden
          />
        );
      })}
    </>
  );
}
