import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TOOLS } from '../seo/site';

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only rounded bg-white px-3 py-2 text-navy focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50">
        Skip to content
      </a>
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="group block text-white no-underline" aria-label="Bits Please, home">
            <span className="block font-mono text-lg font-medium tracking-wide">BITS PLEASE</span>
            <span className="block text-sm text-slate-300">Just give us the bits.</span>
          </Link>
          <button
            type="button"
            className="rounded border border-slate-500 px-3 py-2 text-sm lg:hidden"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Close menu' : 'Menu'}
          </button>
          <nav id="site-nav" aria-label="Main" className={`${open ? 'block' : 'hidden'} absolute left-0 right-0 top-[64px] z-40 bg-navy px-4 pb-3 lg:static lg:block lg:p-0`}>
            <ul className="flex flex-col lg:flex-row lg:gap-1">
              {TOOLS.map((t) => (
                <li key={t.path}>
                  <NavLink
                    to={t.path}
                    className={({ isActive }) =>
                      `flex items-baseline gap-2 border-b-2 px-3 py-3 text-sm no-underline transition-colors lg:py-4 ${
                        isActive ? 'border-blue-400 bg-white/10 text-white' : 'border-transparent text-slate-300 hover:text-white'
                      }`
                    }
                  >
                    <span className="font-mono text-xs text-blue-300">{t.n}</span>
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <footer className="bg-navy text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-mono text-base text-white">BITS PLEASE</p>
            <p className="mt-1 max-w-md">
              A free IPv4 study tool. Everything is calculated in your browser. No account, no tracking of your inputs, and no AI services involved.
            </p>
            <p className="mt-5 max-w-md">© 2026 Please Labs · Built for learners</p>
          </div>
          <nav aria-label="Tools">
            <ul className="grid gap-1">
              {TOOLS.map((t) => (
                <li key={t.path}>
                  <Link to={t.path} className="text-slate-300 hover:text-white">{t.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
