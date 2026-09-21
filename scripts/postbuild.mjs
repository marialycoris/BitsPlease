// Generates per-route HTML (unique <head>), sitemap.xml, robots.txt and 404.html after `vite build`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildSchemas } from '../src/seo/schema.mjs';

const dist = new URL('../dist/', import.meta.url).pathname;
const pages = JSON.parse(readFileSync(new URL('../src/seo/pages.json', import.meta.url), 'utf8'));
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://your-domain.com').replace(/\/$/, '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const template = readFileSync(join(dist, 'index.html'), 'utf8');

function head(path, p) {
  const url = SITE + (path === '/' ? '/' : path);
  const img = SITE + '/og-image.png';
  const tags = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Bits Please" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Bits Please: Just give us the bits. Free networking tools for IT/CS students." />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    ...buildSchemas(path, p, SITE).map((o) => `<script type="application/ld+json" data-bp-jsonld>${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ];
  return tags.join('\n    ');
}

function render(path, p) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('<!--BP_HEAD-->', head(path, p));
  const noscript = `<noscript><h1>${esc(p.name === 'Bits Please' ? p.title : p.name)}</h1><p>${esc(p.description)}</p><p>Bits Please needs JavaScript to run its calculators in your browser.</p></noscript>`;
  return html.replace('<!--BP_NOSCRIPT-->', noscript);
}

for (const [path, p] of Object.entries(pages)) {
  const html = render(path, p);
  if (path === '/') writeFileSync(join(dist, 'index.html'), html);
  else {
    mkdirSync(join(dist, path), { recursive: true });
    writeFileSync(join(dist, path, 'index.html'), html);
  }
}

// 404 page (also works as the SPA fallback on GitHub Pages): no canonical, noindex.
writeFileSync(
  join(dist, '404.html'),
  template
    .replace('<!--BP_HEAD-->', '<meta name="robots" content="noindex" />')
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Page not found | Bits Please</title>')
    .replace('<!--BP_NOSCRIPT-->', ''),
);

const today = new Date().toISOString().slice(0, 10);
const urls = Object.keys(pages).map((p) => `  <url>\n    <loc>${SITE}${p === '/' ? '/' : p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`);
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`postbuild: wrote ${Object.keys(pages).length} pages for ${SITE}`);
