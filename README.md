# Chess Tournament Curicó

Plataforma web multi-torneo para eventos de ajedrez en Curicó: landing con torneo destacado, inscripciones por slug, panel admin con selector de contexto, archivos públicos y vistas en vivo.

Repositorio: [github.com/fcbarera0210/chess-tournament-cco](https://github.com/fcbarera0210/chess-tournament-cco)

## Stack

- **Astro 6** + React (islas)
- **Tailwind CSS 4**
- **Neon PostgreSQL** + Drizzle ORM
- **Vercel Blob** (galería de fotos)
- **Auth.js** (credenciales, multi-admin)
- **Vercel** (deploy)

## Requisitos

- Node.js >= 22.12
- Cuenta [Neon](https://neon.tech) con base PostgreSQL
- Cuenta [Vercel](https://vercel.com) con Blob Storage

## Configuración local

1. Clona el repositorio e instala dependencias:

```bash
npm install
```

2. Copia las variables de entorno:

```bash
cp .env.example .env.local
```

3. Configura `.env.local`:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=<genera con: openssl rand -base64 32>
ADMIN_SEED_USERNAME=tu_usuario
ADMIN_SEED_PASSWORD=tu_contraseña_segura
BLOB_READ_WRITE_TOKEN=vercel_blob_...
BLOB_STORE_ID=store_...
```

Opcional para scripts de backup: `PUBLIC_TOURNAMENT_SLUG=curico-2026` (fallback si no usas `--slug`).

4. Aplica el esquema a Neon:

```bash
npm run db:push
```

5. Crea el torneo y el primer admin:

```bash
npm run db:seed
```

6. Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321).

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Añade las mismas variables de entorno en **Settings → Environment Variables**.
3. Ejecuta `db:push` y `db:seed` una vez contra la base de producción (desde tu máquina con `DATABASE_URL` de prod).
4. Deploy automático en cada push.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Home: torneo destacado + archivos de torneos finalizados |
| `/torneo/{slug}` | Archivo: clasificación, partidas, galería |
| `/inscripcion/{slug}` | Formulario de registro (solo si `publicRegistration`) |
| `/clasificacion/{slug}` | Tabla de posiciones |
| `/live/{slug}` | Monitoreo en vivo |
| `/kiosk/{slug}` | Vista proyección |
| `/admin` | Panel de gestión (requiere login) |
| `/admin/torneos` | Listado y creación de torneos |
| `/admin/galeria` | Galería del torneo seleccionado |
| `/admin/login` | Inicio de sesión |

Las rutas sin slug (`/torneo`, `/inscripcion`, etc.) ya no existen — responden 404.

## Multi-torneo

- **Torneo destacado**: único torneo con `showOnHome=true` y estado activo; aparece en el home con CTAs.
- **Torneos internos**: `showOnHome=false` + `publicRegistration=false` — solo visibles en admin.
- **Archivos públicos**: torneos `finished` con `showOnHome=true` listados en home → `/torneo/{slug}`.
- **Selector admin**: el header del panel guarda el torneo activo en cookie; todas las pantallas operan sobre ese contexto.

## Cerrar y archivar un torneo

1. **Backup** (obligatorio antes de cambios en producción):

```bash
npm run db:backup
```

Guarda un JSON en `backups/` con jugadores, rondas y partidas. También recomendamos un snapshot desde la consola de Neon.

2. En `/admin/torneo` (con el torneo correcto seleccionado), pulsa **Finalizado**. Esto:
   - Protege los datos contra reinicios y edición de rondas.
   - Si `showOnHome=true`, el torneo aparece en la sección de archivos del home.
   - Redirige `/live/{slug}` y `/kiosk/{slug}` al archivo.

3. Sube fotos en `/admin/galeria` (se optimizan a WebP en el navegador y se guardan en Vercel Blob).

4. Exporta datos completos (incluye contacto de jugadores) con **Exportar CSV (ZIP)** en `/admin/torneo`.

## Operación el día del evento

1. **Check-in** de jugadores en `/admin/jugadores`.
2. **Crear rondas** en `/admin/rondas` → emparejamientos y activar.
3. **Resultados** desde el celular en la misma pantalla de ronda.
4. Abre `/kiosk/{slug}` en notebooks para que todos vean el estado.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:push` | Sincroniza esquema con Neon |
| `npm run db:seed` | Crea torneo + admin inicial |
| `npm run db:backup` | Exporta JSON (`--slug nombre` o `--all` para todos) |
| `npm run db:generate` | Genera migraciones Drizzle |

## Roadmap

Ver [docs/ROADMAP.md](docs/ROADMAP.md) para la iteración 2 (multi-torneo).

## Seguridad

- No commitees `.env.local` ni credenciales.
- Las contraseñas de admin se almacenan con bcrypt.
- Crea admins adicionales desde `/admin/usuarios` una vez autenticado.
- Los datos de torneos finalizados no pueden reiniciarse desde el panel.
