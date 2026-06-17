# Chess Tournament Curicó

Plataforma web para el torneo de ajedrez en Curicó: landing, inscripciones, panel admin móvil y vistas en vivo (`/kiosk`, `/live`).

Repositorio: [github.com/fcbarera0210/chess-tournament-cco](https://github.com/fcbarera0210/chess-tournament-cco)

## Stack

- **Astro 6** + React (islas)
- **Tailwind CSS 4**
- **Neon PostgreSQL** + Drizzle ORM
- **Auth.js** (credenciales, multi-admin)
- **Vercel** (deploy)

## Requisitos

- Node.js >= 22.12
- Cuenta [Neon](https://neon.tech) con base PostgreSQL
- Cuenta [Vercel](https://vercel.com)

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
PUBLIC_TOURNAMENT_SLUG=curico-2026
```

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
| `/` | Landing pública |
| `/inscripcion` | Formulario de registro |
| `/clasificacion` | Tabla de posiciones |
| `/kiosk` | Vista proyección (solo lectura, mesas grandes) |
| `/live` | Monitoreo organizadores (solo lectura) |
| `/admin` | Panel de gestión (requiere login) |
| `/admin/login` | Inicio de sesión |

## Operación el día del evento

1. **Check-in** de jugadores en `/admin/jugadores`.
2. **Iniciar torneo** en `/admin/torneo` → crea ronda 1.
3. **Emparejamientos** en `/admin/rondas/1` → guardar y activar.
4. **Resultados** desde el celular en la misma pantalla de ronda.
5. Abre `/kiosk` en notebooks para que todos vean el estado.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:push` | Sincroniza esquema con Neon |
| `npm run db:seed` | Crea torneo + admin inicial |
| `npm run db:generate` | Genera migraciones Drizzle |

## Seguridad

- No commitees `.env.local` ni credenciales.
- Las contraseñas de admin se almacenan con bcrypt.
- Crea admins adicionales desde `/admin/usuarios` una vez autenticado.
