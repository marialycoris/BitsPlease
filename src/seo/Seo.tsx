import { useEffect } from 'react';
import { buildSchemas } from './schema.mjs';
import { PAGES, SITE_URL } from './site';

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/** Keeps <head> in sync on client-side navigation. Static HTML already carries the same tags. */
export function Seo({ path }: { path: string }) {
  useEffect(() => {
    const page = PAGES[path];
    if (!page) {
      document.title = 'Page not found | Bits Please';
      setMeta('name', 'robots', 'noindex');
      return;
    }
    const url = SITE_URL + (path === '/' ? '/' : path);
    document.title = page.title;
    setMeta('name', 'robots', 'index, follow');
    setMeta('name', 'description', page.description);
    setMeta('property', 'og:title', page.title);
    setMeta('property', 'og:description', page.description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', page.title);
    setMeta('name', 'twitter:description', page.description);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
    document.head.querySelectorAll('script[data-bp-jsonld]').forEach((n) => n.remove());
    for (const obj of buildSchemas(path, page, SITE_URL)) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute('data-bp-jsonld', '');
      s.text = JSON.stringify(obj);
      document.head.appendChild(s);
    }
  }, [path]);
  return null;
}
