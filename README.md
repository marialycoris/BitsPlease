# Bits Please

> Just give us the bits.

Free IPv4 networking toolkit for IT/CS students: Binary Lab, IP Calculator, Custom Subnet, Subnet Generator, and VLSM Calculator. React + TypeScript + Tailwind. Fully client-side. No backend, no database, no AI/LLM APIs.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # networking unit tests (vitest)
```

## Build and deploy

```bash
SITE_URL=https://your-real-domain.com VITE_SITE_URL=https://your-real-domain.com npm run build
```

Set both variables to your production domain. `VITE_SITE_URL` is used by the app at runtime (canonical, Open Graph, JSON-LD) and `SITE_URL` by the post-build step, which writes:

- a separate `index.html` per route with its own title, description, canonical, Open Graph/Twitter tags, and JSON-LD
- `sitemap.xml` and `robots.txt` using your domain
- `404.html` (noindex)

Upload `dist/` to Vercel, Netlify, GitHub Pages, or any static host. On Vercel/Netlify set the two variables in project settings, build command `npm run build`, output directory `dist`.

## Project layout

- `src/lib/network.ts`: all IPv4 logic (framework-free, unit-tested)
- `src/seo/pages.json`: titles, descriptions, and FAQ content per route (single source for head tags, JSON-LD, and visible FAQs)
- `src/pages/`: one file per route. Add guides later under `src/pages/guides/` and register them in `pages.json` and `App.tsx`
- `scripts/postbuild.mjs`: static SEO output

## Notes

- `/31` is treated as a point-to-point link (2 usable) and `/32` as a single host. Everything else uses `2^h - 2`.
- Subnet counts use `2^b` (no historical "minus 2" rule).
- The favicon and `public/og-image.png` (1200x630) are simple placeholders you can restyle.
