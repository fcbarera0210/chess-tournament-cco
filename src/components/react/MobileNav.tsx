import { useEffect, useRef, useState } from 'react';

const activeLinks = [
  { href: '/clasificacion', label: 'Clasificación' },
  { href: '/live', label: 'Live' },
  { href: '/inscripcion', label: 'Inscribirme', primary: true },
];

const finishedLinks = [
  { href: '/torneo', label: 'Resultados', primary: true },
  { href: '/clasificacion', label: 'Clasificación' },
];

type MobileNavProps = {
  finished?: boolean;
};

export function MobileNav({ finished = false }: MobileNavProps) {
  const links = finished ? finishedLinks : activeLinks;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-ink"
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? 'Cerrar menú' : 'Menú'}</span>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div
          id="mobile-nav-menu"
          className="mobile-nav-menu absolute top-[calc(100%+0.5rem)] right-0 z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-surface py-2 shadow-lg"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={
                link.primary
                  ? 'mx-2 mt-1 block rounded-full bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white'
                  : 'block px-4 py-2.5 text-sm font-medium text-muted hover:bg-bg hover:text-ink'
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
