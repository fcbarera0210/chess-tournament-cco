/**
 * Datos del organizador y textos legales estáticos.
 * Puedes sobreescribir nombre y contacto con variables de entorno públicas.
 */
export const eventLegal = {
  organizerName:
    import.meta.env.PUBLIC_ORGANIZER_NAME ??
    process.env.PUBLIC_ORGANIZER_NAME ??
    'Felipe Martinez Yovanovich',

  contactEmail:
    import.meta.env.PUBLIC_CONTACT_EMAIL ??
    process.env.PUBLIC_CONTACT_EMAIL ??
    'fmartinezy@gmail.com',

  /** Meses que se conservan los datos tras el evento */
  dataRetentionMonths: 3,

  minorsPolicy:
    'Los menores de 18 años pueden inscribirse, pero deben asistir acompañados de un adulto responsable durante todo el evento.',

  lastUpdated: 'junio 2026',
} as const;
