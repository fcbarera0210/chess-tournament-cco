// @ts-check
import { defineConfig, memoryCache } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  experimental: {
    cache: {
      provider: memoryCache(),
    },
    routeRules: {
      '/': { maxAge: 60, swr: 120, tags: ['public', 'home'] },
      '/bases': { maxAge: 60, swr: 120, tags: ['public', 'bases'] },
      '/inscripcion/*': { maxAge: 60, swr: 120, tags: ['public', 'registration'] },
      '/torneo/*': { maxAge: 300, swr: 600, tags: ['public', 'archive'] },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
