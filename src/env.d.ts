/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly AUTH_SECRET: string;
  readonly PUBLIC_TOURNAMENT_SLUG?: string;
  readonly ADMIN_SEED_USERNAME?: string;
  readonly ADMIN_SEED_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
