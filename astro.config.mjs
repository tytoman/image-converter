import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL || 'https://image-convert.hydridge.com';

export default defineConfig({
  site,
  output: 'static',
  vite: {
    worker: { format: 'es' },
    build: { assetsInlineLimit: 0 },
  },
});
