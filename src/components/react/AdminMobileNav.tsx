import { useEffect, useRef, useState } from 'react';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/jugadores', label: 'Jugadores' },
  { href: '/admin/torneo', label: 'Torneo' },
  { href: '/admin/rondas', label: 'Rondas' },
  { href: '/admin/galeria', label: 'Galería' },
  { href: '/admin/usuarios', label: 'Admins' },
  { href: '/live', label: 'Live' },
  { href: '/', label: 'Sitio público', muted: true },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminMobileNavProps = {
  pathname: string;
};

export function AdminMobileNav({ pathname }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/csrf', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken ?? ''))
      .catch(() => {});
  }, []);

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
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
        aria-expanded={open}
        aria-controls="admin-mobile-nav-menu"
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
          id="admin-mobile-nav-menu"
          className="mobile-nav-menu absolute top-[calc(100%+0.5rem)] right-0 z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-dark)] py-2 shadow-lg"
        >
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                className={
                  active
                    ? 'admin-nav-link admin-nav-link-active block'
                    : link.muted
                      ? 'admin-nav-link block text-white/50'
                      : 'admin-nav-link block'
                }
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
          <form method="post" action="/api/auth/signout" className="border-t border-white/10 px-1 pt-1">
            {csrfToken && <input type="hidden" name="csrfToken" value={csrfToken} />}
            <input type="hidden" name="callbackUrl" value="/admin/login" />
            <button
              type="submit"
              disabled={!csrfToken}
              className="admin-nav-link block w-full text-left text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
