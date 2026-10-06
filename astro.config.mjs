import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  vite: {
    worker: { format: 'es' },
    build: { assetsInlineLimit: 0 },
  },
});
