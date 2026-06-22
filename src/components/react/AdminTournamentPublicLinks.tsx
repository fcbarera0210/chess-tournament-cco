import { getTournamentPublicLinks } from '../../lib/tournament-public-links';

type Props = {
  slug: string;
  status: string;
  variant?: 'card' | 'inline';
};

export function AdminTournamentPublicLinks({ slug, status, variant = 'card' }: Props) {
  const links = getTournamentPublicLinks(slug, status);

  if (variant === 'inline') {
    return (
      <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
          >
            {link.label}
          </a>
        ))}
      </span>
    );
  }

  return (
    <div className="admin-card p-5">
      <h2 className="font-display text-lg font-bold">Enlaces del torneo</h2>
      <p className="mt-1 text-sm text-muted">
        Acceso directo a las vistas públicas por slug — útil para torneos internos que no aparecen en
        el home.
      </p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-3 rounded-xl border border-border px-4 py-3 transition hover:bg-bg"
            >
              <span>
                <span className="block font-semibold group-hover:underline">{link.label}</span>
                {link.description && (
                  <span className="mt-0.5 block text-xs text-muted">{link.description}</span>
                )}
                <span className="mt-1 block font-mono text-xs text-muted">{link.href}</span>
              </span>
              <span className="shrink-0 text-muted">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
