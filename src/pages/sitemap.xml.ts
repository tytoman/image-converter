import type { APIRoute } from 'astro';
import { conversions } from '../data/conversions';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  // A public origin is required for a useful sitemap. Set SITE_URL in the
  // deployment environment; without it, return an empty sitemap rather than
  // publishing invalid or guessed canonical URLs.
  const paths = [
    '/',
    '/licenses/',
    ...conversions.map(({ slug }) => `/convert/${slug}/`),
  ];
  const urls = site
    ? paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n')
    : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
