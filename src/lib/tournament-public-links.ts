export type TournamentPublicLink = {
  href: string;
  label: string;
  description?: string;
};

export function getTournamentPublicLinks(slug: string, status: string): TournamentPublicLink[] {
  if (status === 'finished') {
    return [
      {
        href: `/torneo/${slug}`,
        label: 'Archivo',
        description: 'Resultados, partidas y galería',
      },
      {
        href: `/clasificacion/${slug}`,
        label: 'Clasificación',
        description: 'Tabla completa de posiciones',
      },
    ];
  }

  return [
    {
      href: `/live/${slug}`,
      label: 'Live',
      description: 'Monitoreo de rondas y top de clasificación',
    },
    {
      href: `/kiosk/${slug}`,
      label: 'Kiosk',
      description: 'Vista para proyección en pantalla',
    },
    {
      href: `/clasificacion/${slug}`,
      label: 'Clasificación',
      description: 'Tabla completa de posiciones',
    },
  ];
}
