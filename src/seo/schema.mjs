/**
 * Builds schema.org JSON-LD objects. Shared by the client (runtime head updates)
 * and by scripts/postbuild.mjs (static head for every route).
 */
export function buildSchemas(path, page, siteUrl) {
  const url = siteUrl.replace(/\/$/, '') + (path === '/' ? '/' : path);
  if (path === '/') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Bits Please',
        alternateName: 'Just give us the bits.',
        url,
        description: page.description,
        inLanguage: 'en',
      },
    ];
  }
  const out = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: page.name + ' | Bits Please',
      url,
      description: page.description,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any (runs in the browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    },
  ];
  if (page.faq && page.faq.length) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  return out;
}
