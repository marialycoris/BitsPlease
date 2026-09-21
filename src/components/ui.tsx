import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PAGES } from '../seo/site';
import { Seo } from '../seo/Seo';

export function PageShell({ path, h1, lead, children }: { path: string; h1: string; lead: ReactNode; children: ReactNode }) {
  return (
    <>
      <Seo path={path} />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <h1 className="text-3xl font-semibold md:text-4xl">{h1}</h1>
          <p className="mt-3 text-justify text-lg leading-7 text-slate-600">{lead}</p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </>
  );
}

export function Field({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string | null; children: (p: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(' ') || undefined, invalid: !!error })}
      {hint && <p id={hintId} className="mt-1 text-sm text-slate-600">{hint}</p>}
      {error && <p id={errId} className="mt-1 text-sm font-medium text-err">Error: {error}</p>}
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-md border border-err bg-red-50 px-4 py-3 text-err">
      <p className="font-medium">We could not calculate that.</p>
      <p className="mt-1 text-sm text-red-800">{children}</p>
    </div>
  );
}

export function ResultBanner({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mb-4 flex items-center gap-2 text-sm font-medium text-green-800">
      <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ok text-xs text-white">✓</span>
      {children}
    </p>
  );
}

export function Explain({ children, title = 'How was this calculated?' }: { children: ReactNode; title?: string }) {
  return (
    <details className="group mt-6 rounded-md border border-blue-200 bg-tint/40">
      <summary className="cursor-pointer select-none px-4 py-3 font-medium text-navy marker:text-brand">{title}</summary>
      <div className="space-y-3 border-t border-blue-200 px-4 py-4 text-slate-700">{children}</div>
    </details>
  );
}

export function Steps({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-x-auto rounded bg-white p-3 font-mono text-sm leading-6 text-navy ring-1 ring-slate-200">{lines.join('\n')}</pre>
  );
}

export function DefList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2">
          <dt className="text-sm text-slate-600">{k}</dt>
          <dd className="text-right font-mono text-base font-medium text-navy [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4 md:p-5" aria-label={title}>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function TableWrap({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const th = 'border-b border-slate-200 bg-page px-3 py-2 text-center font-medium text-slate-700 whitespace-nowrap';
export const td = 'border-b border-slate-100 px-3 py-2 text-center font-mono whitespace-nowrap';

export function Faq({ path }: { path: string }) {
  const faq = PAGES[path]?.faq ?? [];
  if (!faq.length) return null;
  return (
    <section aria-labelledby="faq-h">
      <h2 id="faq-h" className="mb-3 mt-10 text-2xl font-semibold">Frequently asked questions</h2>
      <div className="space-y-5">
        {faq.map((f) => (
          <div key={f.q}>
            <h3 className="text-lg font-semibold">{f.q}</h3>
            <p className="mt-1 text-justify leading-7 text-slate-700">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NextStep({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <aside className="mt-10 rounded-md border border-blue-200 bg-tint px-5 py-4" aria-label="Next step">
      <p className="text-justify text-navy">
        {children} <Link to={to} className="font-medium underline">{label}</Link>.
      </p>
    </aside>
  );
}

/** Dotted binary with the network bits (first `prefix` bits) shaded. */
export function BitString({ binary, prefix }: { binary: string; prefix: number }) {
  let seen = 0;
  return (
    <span className="whitespace-nowrap font-mono">
      {binary.split('').map((c, i) => {
        if (c === '.') return <span key={i} className="text-slate-400">.</span>;
        const isNet = seen < prefix;
        seen++;
        return (
          <span key={i} className={isNet ? 'bg-tint text-navy' : 'text-slate-600'}>{c}</span>
        );
      })}
    </span>
  );
}

export function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}
