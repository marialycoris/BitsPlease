import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BitBoard } from '../components/BitBoard';
import { decimalToBinary } from '../lib/network';
import { Seo } from '../seo/Seo';
import { TOOLS } from '../seo/site';

const REASONS = [
  ['Free to use', 'No paywall between you and the answer.'],
  ['No account required', 'Open a page and start calculating.'],
  ['Runs in your browser', 'Your inputs never leave your device. There is no backend.'],
  ['Step-by-step explanations', 'Every result shows the formula with your own numbers.'],
  ['Built for beginners', 'Plain language first, jargon second.'],
];

export default function Home() {
  const [v, setV] = useState(192);
  return (
    <>
      <Seo path="/" />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Free networking tools for IT/CS students</h1>
            <p className="mt-4 max-w-[52ch] text-lg leading-7 text-slate-600">
              Learn, calculate, and understand IPv4 networking. Each tool shows the answer and the reasoning behind it, from binary all the way to VLSM.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/binary-lab" className="btn no-underline !text-white">Start with the Binary Lab</Link>
              <Link to="/ip-calculator" className="btn-quiet no-underline !text-navy">Open the IP Calculator</Link>
            </div>
          </div>
          <div className="card p-5">
            <p className="mb-3 text-sm text-slate-600">
              Every IPv4 address is four groups of 8 bits. Select a bit to see how this one becomes a number.
            </p>
            <BitBoard value={v} onChange={setV} />
            <p className="mt-2 font-mono text-sm text-slate-600">binary {decimalToBinary(v)}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <section aria-labelledby="tools-h">
          <h2 id="tools-h" className="text-2xl font-semibold">Five tools, one learning path</h2>
          <p className="mt-2 text-slate-600">
            Start with the basics: binary, then IP addressing, then subnet masks, subnetting, and finally VLSM. Each tool builds on the one before it.
          </p>
          <ol className="mt-6 grid gap-0 border-l-2 border-tint pl-0">
            {TOOLS.map((t) => (
              <li key={t.path} className="relative">
                <Link to={t.path} className="group flex items-start gap-4 border-b border-slate-200 bg-white py-4 pl-5 pr-4 text-navy no-underline last:border-b-0 hover:bg-tint/40 sm:items-center">
                  <span className="mt-0.5 font-mono text-lg text-brand sm:mt-0">{t.n}</span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold">{t.label}</span>
                    <span className="block text-slate-600">{t.question}</span>
                  </span>
                  <span className="hidden text-sm text-slate-600 sm:block">{t.blurb}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="why-h" className="mt-14">
          <h2 id="why-h" className="text-2xl font-semibold">Why Bits Please?</h2>
          <ul className="mt-4 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {REASONS.map(([t, d]) => (
              <li key={t} className="border-l-2 border-brand pl-4">
                <p className="font-semibold">{t}</p>
                <p className="text-slate-600">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="prose-bp mt-14" aria-labelledby="learn-h">
          <h2 id="learn-h">What you will learn</h2>
          <p>
            An IPv4 address is a 32-bit number, usually written as four decimal octets such as <code>192.168.1.25</code>. To work with these addresses you need to read them in binary, which is what the Binary Lab is for.
          </p>
          <p>
            A subnet mask, or its shorter CIDR form such as <code>/24</code>, marks which bits identify the network and which identify a host. Once that clicks, subnetting is a matter of borrowing host bits to make more, smaller networks. VLSM goes one step further and gives each subnet exactly the size it needs.
          </p>
          <p>
            Work through the tools in order, or jump straight to the one you need. Either way, open the “How was this calculated?” section under a result to see the formula filled in with your numbers.
          </p>
        </section>
      </div>
    </>
  );
}
