import { useMemo, useState, type FormEvent } from 'react';
import { describeClass, generateSubnets, getAddressClass, getDefaultPrefix, ipError, ipToBinary, MAX_ROWS, parsePrefix, MSG } from '../lib/network';
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

// Bit roles: original network bits, borrowed (subnet) bits, and remaining host bits.
type Role = 'net' | 'sub' | 'host';
const roleOf = (i: number, orig: number, newP: number): Role => (i < orig ? 'net' : i < newP ? 'sub' : 'host');
const ROLE_STYLE: Record<Role, string> = {
  net: 'bg-slate-200 text-navy',
  sub: 'bg-brand text-white font-semibold',
  host: 'bg-white text-slate-600',
};

/** The subnet's position counted from 0, written in binary using only the borrowed bits. */
function subnetBits(index: number, borrowed: number): string {
  return borrowed === 0 ? '' : (index - 1).toString(2).padStart(borrowed, '0');
}

/** Dotted 32-bit binary with the three bit roles shaded. */
function RoleBits({ binary, orig, newP }: { binary: string; orig: number; newP: number }) {
  let pos = 0;
  return (
    <span className="whitespace-nowrap">
      {binary.split('').map((c, i) => {
        if (c === '.') return <span key={i} className="text-slate-400">.</span>;
        const role = roleOf(pos++, orig, newP);
        return <span key={i} className={ROLE_STYLE[role]}>{c}</span>;
      })}
    </span>
  );
}

function Legend({ orig, borrowed, host }: { orig: number; borrowed: number; host: number }) {
  const item = (role: Role, label: string) => (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`inline-block h-4 w-4 rounded-sm border border-slate-300 ${ROLE_STYLE[role].split(' ')[0]}`} />
      {label}
    </span>
  );
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
      {item('net', `${orig} original network bits`)}
      {item('sub', `${borrowed} borrowed subnet bits`)}
      {item('host', `${host} host bits`)}
    </p>
  );
}

/** Place-value bit map: the same idea as a subnetting chart, drawn for the chosen subnet. */
function BitMap({ r, sel, onSel }: { r: GeneratorResult; sel: number; onSel: (n: number) => void }) {
  const subnet = r.subnets[Math.min(Math.max(sel, 1), r.subnets.length) - 1];
  const bits = ipToBinary(subnet.network).replace(/\./g, '');
  const places = [128, 64, 32, 16, 8, 4, 2, 1];
  return (
    <ResultCard title="Binary subnet bits">
      <p className="mb-4 text-sm text-slate-700">
        Each cell is one bit of the network address, with its place value above it. The heavy vertical lines mark where the original network ends and where the host bits begin. The blue cells are the bits borrowed to create subnets, and they are the only bits that change from one subnet to the next.
      </p>
      <div className="mb-4 max-w-[12rem]">
        <Field label="Show subnet number">
          {({ id }) => (
            <input id={id} type="number" min={1} max={r.subnets.length} className="input" value={sel} onChange={(e) => onSel(Number(e.target.value) || 1)} />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-3" role="img" aria-label={`Subnet ${subnet.index} network address ${subnet.network} in binary: ${bits.slice(0, r.originalPrefix)} network bits, ${bits.slice(r.originalPrefix, r.newPrefix) || 'no'} subnet bits, and ${bits.slice(r.newPrefix) || 'no'} host bits.`}>
        {[0, 1, 2, 3].map((o) => (
          <div key={o} className="flex">
            {places.map((p, k) => {
              const i = o * 8 + k;
              const role = roleOf(i, r.originalPrefix, r.newPrefix);
              const divider = i === r.originalPrefix || i === r.newPrefix;
              return (
                <div key={i} className="w-7 text-center sm:w-9">
                  <div className="font-mono text-[11px] text-slate-600 sm:text-xs">{p}</div>
                  <div className={`flex h-8 items-center justify-center border border-slate-300 font-mono text-sm sm:h-9 sm:text-base ${ROLE_STYLE[role]} ${divider ? 'border-l-4 border-l-navy' : ''}`}>
                    {bits[i]}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4"><Legend orig={r.originalPrefix} borrowed={r.borrowedBits} host={r.hostBits} /></div>
      <p className="mt-3 font-mono text-sm text-navy">
        Subnet {subnet.index}: {subnet.network}/{subnet.prefix}
        {r.borrowedBits > 0 && <> · subnet bits {subnetBits(subnet.index, r.borrowedBits)}</>}
      </p>
    </ResultCard>
  );
}

export default function SubnetGenerator() {
  const [f, setF] = useState({ net: '192.168.1.0', cidr: '/24', count: '4' });
  const [sub, setSub] = useState(f);
  const [sel, setSel] = useState(1);
  const { result, assumed } = useMemo(() => run(sub.net, sub.cidr, sub.count), [sub]);
  const onSubmit = (e: FormEvent) => { e.preventDefault(); setSub(f); setSel(1); };
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

              <BitMap r={r} sel={sel} onSel={setSel} />

              <TableWrap caption="Generated subnets">
                <thead>
                  <tr>
                    {['Subnet', 'Subnet bits', 'Network', 'CIDR', 'Subnet mask', 'First usable', 'Last usable', 'Broadcast', 'Total addresses', 'Usable hosts', 'Network in binary'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {r.subnets.map((s) => (
                    <tr key={s.index}>
                      <th scope="row" className={`${td} font-sans`}>{s.index}</th>
                      <td className={`${td} font-medium text-brand`}>{subnetBits(s.index, r.borrowedBits) || '—'}</td>
                      <td className={td}>{s.network}</td><td className={td}>/{s.prefix}</td><td className={td}>{s.mask}</td>
                      <td className={td}>{s.firstHost}</td><td className={td}>{s.lastHost}</td><td className={td}>{s.broadcast}</td>
                      <td className={td}>{fmt(s.totalAddresses)}</td><td className={td}>{fmt(s.usableHosts)}</td>
                      <td className={td}><RoleBits binary={ipToBinary(s.network)} orig={r.originalPrefix} newP={r.newPrefix} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <Legend orig={r.originalPrefix} borrowed={r.borrowedBits} host={r.hostBits} />
              {r.truncated && <p className="text-sm text-slate-600">Showing the first {fmt(MAX_ROWS)} of {fmt(r.totalSubnets)} subnets.</p>}

              <Explain title="How do the subnet bits work?">
                {r.borrowedBits === 0 ? (
                  <p>Only 1 subnet was requested, so no bits are borrowed and the network stays as {r.baseNetwork}/{r.originalPrefix}. Ask for 2 or more subnets to see subnet bits appear.</p>
                ) : (
                  <>
                    <p>
                      Your network {r.baseNetwork}/{r.originalPrefix} has {r.originalPrefix} network bits and {32 - r.originalPrefix} host bits. To make more subnets, the first {r.borrowedBits} of those host bits are borrowed and treated as part of the network. Those {r.borrowedBits} bits are the <strong>subnet bits</strong>.
                    </p>
                    <p>
                      Every combination of the subnet bits is one subnet, so {r.borrowedBits} bits give 2^{r.borrowedBits} = {fmt(r.totalSubnets)} subnets. Counting up in binary from {'0'.repeat(r.borrowedBits)} to {'1'.repeat(r.borrowedBits)} walks through them in order. In the table, subnet 1 has subnet bits {subnetBits(1, r.borrowedBits)}, subnet 2 has {subnetBits(Math.min(2, r.totalSubnets), r.borrowedBits)}, and subnet {fmt(r.subnets.length)} has {subnetBits(r.subnets.length, r.borrowedBits)}. The Subnet column counts from 1, while the subnet bits count from 0.
                    </p>
                    <p>
                      The remaining {r.hostBits} bits are host bits. They stay free to number devices inside each subnet, which is why each subnet holds 2^{r.hostBits} = {fmt(r.addressesPerSubnet)} addresses. Setting all host bits to 0 gives the network address, and setting them all to 1 gives the broadcast address.
                    </p>
                    <p>
                      Because the subnet bits sit just before the host bits, adding 1 to the subnet bits moves the address forward by one block ({fmt(r.blockSize)} addresses). That is why the networks step by {fmt(r.blockSize)}.
                    </p>
                  </>
                )}
              </Explain>

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
        <h2>Reading the subnet bits</h2>
        <p>Subnetting charts list each subnet with the borrowed bits written in binary beside its address range. Those bits are simply the subnet's position counted in binary: 00 for the first subnet, 01 for the second, 10 for the third, and 11 for the fourth when two bits are borrowed. Put those bits in front of the host bits, and the address range follows. For example, with 192.10.10.0/24 and 4 bits borrowed, subnet bits 0001 followed by four host bits give the range 192.10.10.16 to 192.10.10.31.</p>
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