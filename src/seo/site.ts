import pages from './pages.json';

/** Set VITE_SITE_URL at build time (e.g. https://bitsplease.example). */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL || 'https://your-domain.com').replace(/\/$/, '');

export type PageMeta = { name: string; title: string; description: string; faq: { q: string; a: string }[] };
export const PAGES = pages as Record<string, PageMeta>;

export const TOOLS = [
  { n: '01', path: '/binary-lab', label: 'Binary Lab', blurb: 'Understand binary', question: 'How do bits become numbers?' },
  { n: '02', path: '/ip-calculator', label: 'IP Calculator', blurb: 'Analyze an IP and subnet', question: 'What network is this address on?' },
  { n: '03', path: '/custom-subnet', label: 'Custom Subnet', blurb: 'Find the mask you need', question: 'What subnet mask should I use?' },
  { n: '04', path: '/subnet-generator', label: 'Subnet Generator', blurb: 'Split into equal subnets', question: 'What subnets do I get?' },
  { n: '05', path: '/vlsm-calculator', label: 'VLSM Calculator', blurb: 'Size each subnet to fit', question: 'How do I give each group its own size?' },
] as const;
