import { useMemo, useState, type FormEvent } from 'react';
import { describeClass, generateSubnets, getAddressClass, getDefaultPrefix, ipError, MAX_ROWS, parsePrefix, MSG } from '../lib/network';
import type { AddressClass, GeneratorResult, Result } from '../lib/network';
import { DefList, ErrorBox, Explain, Faq, Field, fmt, NextStep, PageShell, ResultBanner, ResultCard, Steps, TableWrap, td, th } from '../components/ui';

interface Run { result: Result<GeneratorResult>; assumed?: { cls: AddressClass; prefix: number } }

/** CIDR is optional: when blank, fall back to the classful default prefix of the network address. */
function run(net: string, cidr: string, count: string): Run {
  let prefix: number | null;
  let assumed: Run['assumed'];
  if (cidr.trim() === '') {
    const ipErr = ipError(net);
    if (ipErr) return { result: { ok: false, error: ipErr } };
    const cls = getAddressClass(net.trim());
    const def = getDefaultPrefix(cls);
    if (def === null) {
      return { result: { ok: false, error: `No CIDR was entered, and ${describeClass(cls)} addresses have no default classful prefix. Please enter a CIDR prefix from /0 to /32.` } };
    }
    prefix = def;
    assumed = { cls, prefix: def };
  } else {
    prefix = parsePrefix(cidr);
    if (prefix === null) return { result: { ok: false, error: MSG.cidr } };
  }
  if (count.trim() === '' || !/^\d+$/.test(count.trim())) return { result: { ok: false, error: 'Please enter the number of subnets as a whole number.' } };
  return { result: generateSubnets(net, prefix, Number(count)), assumed };
}

export default function SubnetGenerator() {
  const [f, setF] = useState({ net: '192.168.1.0', cidr: '/24', count: '4' });
  const [sub, setSub] = useState(f);
  const { result, assumed } = useMemo(() => run(sub.net, sub.cidr, sub.count), [sub]);
  const onSubmit = (e: FormEvent) => { e.preventDefault(); setSub(f); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <PageShell
      path="/subnet-generator"
      h1="Subnet Generator: generate IPv4 subnets"
      lead="Divide a network into equal-sized subnets. Enter a network, its CIDR prefix, and how many subnets you need to get every subnet with its host range and broadcast address."
    >
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-4 md:items-start" noValidate>
        <Field label="Network address" hint="Example: 192.168.1.0">
          {({ id, describedBy }) => <input id={id} className="input" value={f.net} onChange={set('net')} autoComplete="off" spellCheck={false} aria-describedby={describedBy} />}
        </Field>
        <Field label="Original CIDR (optional)" hint="Example: /24. Leave blank to use the class default.">
          {({ id, describedBy }) => <input id={id} className="input" value={f.cidr} onChange={set('cidr')} autoComplete="off" aria-describedby={describedBy} />}
        </Field>
        <Field label="Required subnets" hint="Example: 4">
          {({ id, describedBy }) => <input id={id} className="input" inputMode="numeric" value={f.count} onChange={set('count')} autoComplete="off" aria-describedby={describedBy} />}
        </Field>
        <div className="md:pt-6"><button className="btn w-full" type="submit">Generate subnets</button></div>
      </form>

      <div className="mt-6 space-y-6" aria-live="polite">
        {!result.ok && <ErrorBox>{result.error}</ErrorBox>}
        {result.ok && (() => {
          const r = result.value;
          return (
            <>
              <ResultBanner>{fmt(r.totalSubnets)} subnets of /{r.newPrefix} from {r.baseNetwork}/{r.originalPrefix}.</ResultBanner>
              {assumed && (
                <p className="rounded border border-blue-200 bg-tint/50 px-4 py-2 text-sm text-navy">
                  No CIDR was entered, so the {describeClass(assumed.cls)} default of /{assumed.prefix} was used. Classful defaults are historical. Enter a CIDR to override it.
                </p>
              )}
              {r.notice && <p className="rounded border border-blue-200 bg-tint/50 px-4 py-2 text-sm text-navy">{r.notice}</p>}
              {r.totalSubnets > r.requested && (
                <p className="rounded border border-blue-200 bg-tint/50 px-4 py-2 text-sm text-navy">
                  Subnets come in powers of two, so {r.requested} subnets rounds up to {fmt(r.totalSubnets)}. {fmt(r.totalSubnets - r.requested)} are spare.
                </p>
              )}
              <ResultCard title="Summary">
                <DefList items={[['Original CIDR', `/${r.originalPrefix}`], ['New CIDR', `/${r.newPrefix}`], ['Bits borrowed', r.borrowedBits], ['Host bits', r.hostBits], ['Block size', fmt(r.blockSize)], ['Addresses per subnet', fmt(r.addressesPerSubnet)], ['Usable hosts per subnet', fmt(r.usableHosts)], ['Total subnets', fmt(r.totalSubnets)]]} />
              </ResultCard>
              <TableWrap caption="Generated subnets">
                <thead>
                  <tr>
                    {['Subnet', 'Network', 'CIDR', 'Subnet mask', 'First usable', 'Last usable', 'Broadcast', 'Total addresses', 'Usable hosts'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {r.subnets.map((s) => (
                    <tr key={s.index}>
                      <th scope="row" className={`${td} font-sans`}>{s.index}</th>
                      <td className={td}>{s.network}</td><td className={td}>/{s.prefix}</td><td className={td}>{s.mask}</td>
                      <td className={td}>{s.firstHost}</td><td className={td}>{s.lastHost}</td><td className={td}>{s.broadcast}</td>
                      <td className={td}>{fmt(s.totalAddresses)}</td><td className={td}>{fmt(s.usableHosts)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {r.truncated && <p className="text-sm text-slate-600">Showing the first {fmt(MAX_ROWS)} of {fmt(r.totalSubnets)} subnets.</p>}
              <Explain>
                <Steps lines={[...(assumed ? [`No CIDR entered → ${describeClass(assumed.cls)} default prefix = /${assumed.prefix}`, ''] : []), `Required subnets: ${r.requested}`, '', ...r.steps.map((s) => s.text), '', `Borrowed bits = ${r.borrowedBits}`, `New prefix = ${r.originalPrefix} + ${r.borrowedBits} = /${r.newPrefix}`, `Host bits = 32 - ${r.newPrefix} = ${r.hostBits}`, `Total addresses = 2^${r.hostBits} = ${fmt(r.addressesPerSubnet)}`, r.newPrefix >= 31 ? `Usable hosts = ${r.usableHosts}` : `Usable hosts = ${fmt(r.addressesPerSubnet)} - 2 = ${fmt(r.usableHosts)}`, `Block size = ${fmt(r.blockSize)}, so each subnet starts ${fmt(r.blockSize)} addresses after the previous one`]} />
              </Explain>
            </>
          );
        })()}
      </div>

      <div className="prose-bp mt-8">
        <h2>What does a subnet generator do?</h2>
        <p>A subnet generator splits one network into several smaller networks of the same size. You give it the original network and prefix, plus how many subnets you need, and it lists every resulting subnet with its network address, usable range, and broadcast address.</p>
        <h2>How networks are divided</h2>
        <p>Dividing a network means borrowing bits from the host portion and using them as extra network bits. Each borrowed bit doubles the number of subnets and halves the size of each. Borrowing 2 bits from a /24 gives 4 subnets of /26, each with 64 addresses.</p>
        <h2>Reading the block size</h2>
        <p>The block size is the number of addresses in each subnet. Subnet network addresses are spaced exactly one block apart, which makes it quick to write them out by hand: 0, 64, 128, 192 for a block size of 64.</p>
        <h2>Equal sizes only</h2>
        <p>This tool makes every subnet the same size. When different groups need different numbers of hosts, equal subnets waste addresses. That is the problem VLSM solves.</p>
      </div>
      <Faq path="/subnet-generator" />
      <NextStep to="/vlsm-calculator" label="Continue with the VLSM Calculator">Need different subnet sizes for different departments?</NextStep>
    </PageShell>
  );
}